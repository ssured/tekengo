import { action, createAtom, observable, runInAction, reaction } from "mobx";
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
export const nextObjects = observable({}) as Record<string, string>;

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

const HASH = Symbol();
const IS_PROXY = Symbol();
const REGISTER_INVERSE = Symbol();
export const PATHS = Symbol();
type refProxy = JSONObject & {
  [HASH]: string;
  [IS_PROXY]: true;
  [REGISTER_INVERSE](parent: refProxy, key: string): void;
  [PATHS]: string[][];
  (): void;
};

const isProxy = (u: JSONValue): u is refProxy =>
  (typeof u === "object" && u && (u as any)[IS_PROXY]) || false;

const decodeRef = computedFn((hash: EncodedJSONObjectRef[0]): JSONObject => {
  const source = Object.create(null) as {};

  const onUnobserved = new Set<() => void>([
    () => console.log("unobserve handlers " + hash),
  ]);

  const atom = createAtom(`Node-${hash}`, undefined, () => {
    for (const handler of onUnobserved) handler();
  });

  const references = new Map<refProxy, Set<string>>();
  onUnobserved.add(() => references.clear());

  if (!(hash in knownObjects)) {
    runInAction(() => requestedHashes.add(hash));
  }

  // Watch for data, once data is there, add it to the node
  onUnobserved.add(
    reaction(
      () => knownObjects[hash],
      (stringified, _prev, r) => {
        if (!stringified) return;
        if (sha256(stringified) !== hash) return console.error("invalid hash");
        try {
          const value = JSON.parse(stringified);
          if (typeof value === "object" && value && !Array.isArray(value)) {
            Object.assign(source, value);
            atom.reportChanged();
            r.dispose();
          }
        } catch (e) {
          console.error("could not parse " + stringified);
          return undefined;
        }
      },
      { fireImmediately: true }
    )
  );

  const registerInverse = (parent: refProxy, key: string) => {
    if (!references.has(parent)) references.set(parent, new Set());
    references.get(parent)!.add(key);
  };

  // Tells all known paths to this node
  const paths = () => {
    const paths = Array.from(references.entries()).flatMap(([parent, keys]) =>
      parent[PATHS].flatMap((path) =>
        Array.from(keys).map((key) => path.concat(key))
      )
    );
    return paths.length === 0 ? [[hash]] : paths;
  };

  const o = new Proxy(source, {
    get(source, k) {
      atom.reportObserved();

      if (k === HASH) return hash;
      if (k === IS_PROXY) return true;
      if (k === REGISTER_INVERSE) return registerInverse;
      if (k === PATHS) return paths();

      const result = decodeValue(Reflect.get(source, k));

      if (isProxy(result) && typeof k === "string") {
        result[REGISTER_INVERSE](o, k);
      }

      return result;
    },
    set(source, k, v) {
      console.log("set", source, k, v);
      if (references.size === 0) {
        // this is root
        const nextValue = { ...o, [k]: v };
        runInAction(() => {
          nextObjects[hash] = (
            encodeValue(nextValue) as EncodedJSONObjectRef
          )[0];
        });
        return true;
      }

      const newObject = { ...o, [k]: v };
      for (const [reference, keys] of references) {
        for (const key of keys) {
          reference[key] = newObject;
        }
      }

      return true;
    },
  }) as refProxy;

  return o;
});

const decodeValue = computedFn((e: EncodedJSON): JSONValue => {
  if (!Array.isArray(e)) return e;
  const item = e[0];
  if (typeof item === "string") return decodeRef(item);
  return item.map((i) => decodeValue(i));
});

export const open = (hash: string) => decodeValue([hash]) as refProxy;

// export const decodeObject = (e: EncodedJSONObject): JSONObject =>
//   Object.fromEntries(
//     Array.from(Object.entries(e)).map(([k, v]) => [k, decodeValue(v)])
//   );
