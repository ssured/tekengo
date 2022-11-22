import { action, createAtom, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
import { sha256 } from "../utils/sha256";

type JSONPrimitive = null | string | number | boolean;
type JSONObject = { [k: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONArray | JSONObject;
type EncodedJSONObjectRef = [string];
type EncodedJSONArray = [EncodedJSON[]];
type EncodedJSON = JSONPrimitive | EncodedJSONObjectRef | EncodedJSONArray;
type EncodedJSONObject = {
  [key: string]: EncodedJSON;
};

export const stableStringify = <O extends JSONObject>(
  o: O,
  replacer?:
    | ((this: JSONObject, key: string, value: JSONValue) => JSONValue)
    | undefined,
  space?: string | number | undefined
): string =>
  JSON.stringify(
    Object.fromEntries(
      Array.from(Object.entries(o))
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([k, v]) => [
          k,
          typeof v === "object" && v && !Array.isArray(v)
            ? JSON.parse(stableStringify<typeof v>(v, replacer, space))
            : v,
        ])
    ),
    replacer,
    space
  );

// console.log("str", stableStringify({ b: { d: "D", c: "C" }, a: "A" })); // str {"a":"A","b":{"c":"C","d":"D"}}

export const knownObjects = observable({}) as Record<string, string>;
export const requestedHashes = observable.set<string>();

export const loadJSON = action((encodedObjectString: string) => {
  const hash = sha256(encodedObjectString);
  runInAction(() => {
    knownObjects[hash] = encodedObjectString;
    requestedHashes.delete(hash);
  });
  return hash;
});

const encodeValue = (o: JSONValue): EncodedJSON => {
  if (typeof o !== "object" || o === null) return o as any;
  if (Array.isArray(o)) return [o.map(encodeValue)];

  const stringified = stableStringify(encodeObject(o));
  const hash = sha256(stringified);
  if (!(hash in knownObjects))
    runInAction(() => {
      knownObjects[hash] = stringified;
      requestedHashes.delete(hash);
    });
  return [hash];
};

export const encodeObject = (o: JSONObject): EncodedJSONObject =>
  Object.fromEntries(
    Array.from(Object.entries(o)).map(([k, v]) => [k, encodeValue(v)])
  );

const decodeRef = computedFn((hash: EncodedJSONObjectRef[0]): JSONObject => {
  if (!(hash in knownObjects)) runInAction(() => requestedHashes.add(hash));

  const stringified = knownObjects[hash];
  const obj =
    stringified &&
    (() => {
      try {
        return JSON.parse(stringified);
      } catch (e) {
        console.error("could not parse " + stringified);
        return undefined;
      }
    })();

  const atom = createAtom(
    hash,
    () => {},
    () => {
      console.log("unobserve " + hash);
    }
  );

  const source = obj || {};
  const changes = Object.create(source);

  const o = new Proxy(changes, {
    get(_, k) {
      if (k === "toJSON")
        return () => {
          obj && atom.reportObserved();
          const keys = [] as string[];
          for (const key in source) keys.push(key);
          keys.sort();
          return Object.fromEntries(keys.map((k) => [k, source[k]]));
        };
      obj && atom.reportObserved();
      const v = Reflect.get(_, k);
      return decodeValue(v);
    },
    set(_, k, v) {
      console.log({ _, k, v });
      runInAction(() => Reflect.set(_, k, v));
      atom.reportChanged();
      return true;
    },
  });

  return o;
});

const decodeValue = (e: EncodedJSON): JSONValue => {
  if (!Array.isArray(e)) return e;
  const item = e[0];
  if (typeof item === "string") return decodeRef(item);
  return item.map((i) => decodeValue(i));
};

export const open = (hash: string) => decodeValue([hash]) as JSONObject;

export const decodeObject = (e: EncodedJSONObject): JSONObject =>
  Object.fromEntries(
    Array.from(Object.entries(e)).map(([k, v]) => [k, decodeValue(v)])
  );
