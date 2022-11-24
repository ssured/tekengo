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
const ON_NEXT = Symbol();
export const PATHS = Symbol();
type refProxy = JSONObject & {
  [HASH]: string;
  [IS_PROXY]: true;
  [REGISTER_INVERSE](parent: refProxy, key?: string): void;
  [ON_NEXT](handler: (nextValue: JSONObject) => void): void;
  [PATHS]: string[][];
  (): void;
};

const isProxy = (u: JSONValue): u is refProxy =>
  (typeof u === "object" && u && (u as any)[IS_PROXY]) || false;

const getSingleton = computedFn((hash: EncodedJSONObjectRef[0]) => {
  const source = Object.create(null) as JSONObject;
  const onUnobserved = new Set<() => void>([
    () => console.log("unobserve handlers " + hash),
  ]);

  const atom = createAtom(`Node-${hash}`, undefined, () => {
    for (const handler of onUnobserved) handler();
  });

  // Watch for data, once data is there, add it to the node
  if (!(hash in knownObjects)) {
    runInAction(() => requestedHashes.add(hash));
  }
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

  return {
    source: new Proxy(source, {
      get(source, p) {
        atom.reportObserved();
        return Reflect.get(source, p);
      },
    }),
    onUnobserved,
  };
});

const decodeRef = computedFn((hash: EncodedJSONObjectRef[0]): JSONObject => {
  const { source, onUnobserved } = getSingleton(hash);

  let onNext: ((nextValue: JSONObject) => void) | undefined = undefined;

  // nodes which point to this node with the exact properties
  const referencedBy = new Map<refProxy, Set<string>>();
  onUnobserved.add(() => referencedBy.clear());

  // nodes this node points to
  const references = new Set<refProxy>();
  onUnobserved.add(() => {
    // cleanup inverse references
    for (const reference of references) reference[REGISTER_INVERSE](node);
    references.clear();
  });

  // Keep administration of nodes pointing to me
  const registerInverse = (parent: refProxy, key?: string) => {
    if (typeof key === "string") {
      // register
      if (!referencedBy.has(parent)) referencedBy.set(parent, new Set());
      referencedBy.get(parent)!.add(key);
    } else {
      // unregister
      referencedBy.delete(parent);
    }
  };

  // Tells all known paths to this node
  const paths = () => {
    // return [[hash]];
    const paths = Array.from(referencedBy.entries()).flatMap(([parent, keys]) =>
      parent[PATHS].flatMap((path) =>
        Array.from(keys).map((key) => path.concat(key))
      )
    );
    return paths.length === 0 ? [[hash]] : paths;
  };

  const setOnNext = (handler: (value: JSONObject) => void) => {
    onNext = handler;
  };

  let changes: Record<string, any> = {};

  const node = new Proxy(source, {
    get(source, k) {
      if (typeof k === "symbol") {
        if (k === HASH) return hash;
        if (k === IS_PROXY) return true;
        if (k === REGISTER_INVERSE) return registerInverse;
        if (k === PATHS) return paths();
        if (k === ON_NEXT) return setOnNext;
        return Reflect.get(source, k);
      }

      const result = decodeValue(Reflect.get(source, k));

      if (isProxy(result) && typeof k === "string") {
        references.add(result);
        result[REGISTER_INVERSE](node, k);
      }

      return result;
    },
    set(source, k, v) {
      if (typeof k === "symbol") return false;

      console.log("set", source, k, v);
      changes[k] = v;
      const nextNode = { ...node, ...changes };

      if (onNext) {
        onNext(nextNode);
        return true;
      }

      let didPropagate = false;

      for (const [reference, keys] of referencedBy) {
        for (const key of keys) {
          reference[key] = nextNode;
          didPropagate = true;
        }
      }

      return didPropagate;
    },
  }) as refProxy;

  return node;
});

const decodeValue = computedFn((e: EncodedJSON): JSONValue => {
  if (!Array.isArray(e)) return e;
  const item = e[0];
  if (typeof item === "string") return decodeRef(item);
  return item.map((i) => decodeValue(i));
});

export const open = computedFn(
  (hash: string, onNext: (next: JSONObject) => void) => {
    const value = decodeValue([hash]) as refProxy;
    value[ON_NEXT](onNext);
    return value;
  }
);

// export const decodeObject = (e: EncodedJSONObject): JSONObject =>
//   Object.fromEntries(
//     Array.from(Object.entries(e)).map(([k, v]) => [k, decodeValue(v)])
//   );
