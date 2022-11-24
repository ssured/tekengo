import { action, createAtom, observable, runInAction, reaction } from "mobx";
import { computedFn } from "mobx-utils";
import { dlv, dset } from "../utils/dlvdset";
import { sha256 } from "../utils/sha256";
import type { DeepReadonly, DeepWritable } from "ts-essentials";

type JSONPrimitive = null | string | number | boolean;
type JSONObject = { [k: string]: JSONValue };
type JSONArray = JSONValue[];
type JSONValue = JSONPrimitive | JSONArray | JSONObject;
type EncodedJSONObjectRef = { "": string };
type EncodedJSONArray = EncodedJSON[];
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

export const loadJSON = action((encodedObjectOrString: string | JSONObject) => {
  const encodedObject =
    typeof encodedObjectOrString === "string"
      ? JSON.parse(encodedObjectOrString)
      : encodedObjectOrString;
  const { "": hash } = encodeValue(encodedObject, (hash, stringified) => {
    knownObjects[hash] = stringified;
    requestedHashes.delete(hash);
  }) as EncodedJSONObjectRef;
  return hash;
});

const isRef = (o: JSONObject): o is EncodedJSONObjectRef =>
  Object.keys(o).length === 1 && "" in o;

export const encodeValue = (
  o: JSONValue,
  onObject?: (hash: string, stringified: string) => void
): EncodedJSON => {
  if (typeof o !== "object" || o === null) return o as any;
  if (Array.isArray(o)) return o.map((i) => encodeValue(i, onObject));
  if (isRef(o)) return o;

  const stringified = stableStringify(encodeObject(o, onObject));
  const hash = sha256(stringified);
  onObject?.(hash, stringified);
  return { "": hash };
};

const encodeObject = (
  o: JSONObject,
  onObject?: (hash: string, stringified: string) => void
): EncodedJSONObject =>
  Object.fromEntries(
    Array.from(Object.entries(o)).map(([k, v]) => [k, encodeValue(v, onObject)])
  );

const HASH = Symbol();
const SINGLETON = Symbol();
const hashOfSingleton = (obj: unknown): string | null =>
  (typeof obj === "object" && obj && (obj as any)[HASH]) || null;

const getSingleton = computedFn((hash: EncodedJSONObjectRef[""]) => {
  console.log("getSingleton", hash);
  const source = Object.create(null) as JSONObject;
  const onUnobserved = new Set<() => void>([
    () => console.log("unobserve handlers " + hash),
  ]);

  const atom = createAtom(
    `Node-${hash}`,
    () => console.log("observe " + hash),
    () => {
      for (const handler of onUnobserved) handler();
      onUnobserved.clear();
    }
  );

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
          return console.error("could not parse " + stringified);
        }
      },
      { fireImmediately: true }
    )
  );

  const singleton: JSONObject = new Proxy(source, {
    get(source, p) {
      if (p === HASH) return hash;
      if (p === SINGLETON) return singleton;
      atom.reportObserved();
      return decodeValue(Reflect.get(source, p));
    },
  });
  return singleton;
});

const decodeValue = computedFn((e: EncodedJSON): JSONValue => {
  if (typeof e !== "object" || e == null) return e;
  if (Array.isArray(e)) return e.map(decodeValue);
  if (isRef(e)) return getSingleton(e[""]);
  throw new Error("decode invalid object");
});

export const PATH = Symbol();

// const isProxy = (u: JSONValue): u is refProxy =>
//   (typeof u === "object" && u && (u as any)[IS_PROXY]) || false;

type singletonNode<T extends JSONObject> = DeepReadonly<T> & {
  [HASH]: string;
  // [SINGLETON]: singletonNode<T>;
};
type deepWritableNode<T extends JSONObject> = T;
type deepNode<T extends JSONObject> = {
  readonly [K in keyof T]?: T[K] extends JSONObject ? deepNode<T[K]> : T[K];
} & {
  readonly _: DeepWritable<T>;
  [PATH]: string[];
};
type rootNode<T extends JSONObject> = deepNode<T> & {
  readonly __: T;
};

const openRoot = computedFn(
  <T extends JSONObject>(rootHash: EncodedJSONObjectRef[""]): rootNode<T> => {
    const source = getSingleton(rootHash);
    const stage = observable.box<EncodedJSONObject | T | undefined>(undefined);

    const node = computedFn(
      (
        singleton: JSONObject,
        pathStr: string,
        mutable: boolean
      ): deepNode<JSONObject> => {
        const path = JSON.parse(pathStr); // path from root
        return new Proxy(singleton, {
          get(singleton, p) {
            if (typeof p === "symbol") {
              if (p === PATH) return path;
              return Reflect.get(singleton, p);
            }
            if (p === "_") return node(singleton, pathStr, true);

            const subpath = path.concat(p);

            const own = Reflect.get(singleton, p);
            const result = (mutable && dlv(stage.get() || {}, subpath)) || own;

            if (hashOfSingleton(result)) {
              return node(result, JSON.stringify(subpath), mutable);
            }

            return result;
          },
          set(singleton, p, v) {
            if (!mutable) return false;
            if (typeof p === "symbol") return false;
            runInAction(() => {
              const changes = stage.get() || encodeObject(source);

              if (path.length > 0) {
                let currentChange = dlv(changes, path);

                if (
                  typeof currentChange !== "object" ||
                  currentChange == null ||
                  Array.isArray(currentChange) ||
                  isRef(currentChange)
                )
                  currentChange = encodeObject(singleton);

                // console.log("singleton", encodeObject(singleton));
                dset(changes, path, {
                  // ...encodeObject(singleton),
                  ...currentChange,
                  [p]: v,
                });
              } else {
                (changes as any)[p] = v;
              }

              stage.set(changes);
            });
            return true;
          },
        }) as deepNode<JSONObject>;
      }
    );

    const root = new Proxy(node(source, JSON.stringify([]), false), {
      get(source, p) {
        if (p === "__") return stage.get(); //{ ...encodeObject(source), ...changes };
        return Reflect.get(source, p);
      },
    }) as rootNode<T>;

    return root;
  }
);

// const decodeRef = computedFn((hash: EncodedJSONObjectRef[0]): JSONObject => {
//   const { source, onUnobserved } = getSingleton(hash);

//   let onNext: ((nextValue: JSONObject) => void) | undefined = undefined;

//   // nodes which point to this node with the exact properties
//   const referencedBy = new Map<refProxy, Set<string>>();
//   onUnobserved.add(() => referencedBy.clear());

//   // nodes this node points to
//   const references = new Set<refProxy>();
//   onUnobserved.add(() => {
//     // cleanup inverse references
//     for (const reference of references) reference[REGISTER_INVERSE](node);
//     references.clear();
//   });

//   // Keep administration of nodes pointing to me
//   const registerInverse = (parent: refProxy, key?: string) => {
//     if (typeof key === "string") {
//       // register
//       if (!referencedBy.has(parent)) referencedBy.set(parent, new Set());
//       referencedBy.get(parent)!.add(key);
//     } else {
//       // unregister
//       referencedBy.delete(parent);
//     }
//   };

//   // Tells all known paths to this node
//   const paths = () => {
//     // return [[hash]];
//     const paths = Array.from(referencedBy.entries()).flatMap(([parent, keys]) =>
//       parent[PATHS].flatMap((path) =>
//         Array.from(keys).map((key) => path.concat(key))
//       )
//     );
//     return paths.length === 0 ? [[hash]] : paths;
//   };

//   const setOnNext = (handler: (value: JSONObject) => void) => {
//     onNext = handler;
//   };

//   let changes: Record<string, any> = {};

//   const node = new Proxy(source, {
//     get(source, k) {
//       if (typeof k === "symbol") {
//         if (k === HASH) return hash;
//         if (k === IS_PROXY) return true;
//         if (k === REGISTER_INVERSE) return registerInverse;
//         if (k === PATHS) return paths();
//         if (k === ON_NEXT) return setOnNext;
//         return Reflect.get(source, k);
//       }

//       const result = decodeValue(Reflect.get(source, k));

//       if (isProxy(result) && typeof k === "string") {
//         references.add(result);
//         result[REGISTER_INVERSE](node, k);
//       }

//       return result;
//     },
//     set(source, k, v) {
//       if (typeof k === "symbol") return false;

//       console.log("set", source, k, v);
//       changes[k] = v;
//       const nextNode = { ...node, ...changes };

//       if (onNext) {
//         onNext(nextNode);
//         return true;
//       }

//       let didPropagate = false;

//       for (const [reference, keys] of referencedBy) {
//         for (const key of keys) {
//           reference[key] = nextNode;
//           didPropagate = true;
//         }
//       }

//       return didPropagate;
//     },
//   }) as refProxy;

//   return node;
// });

export const open = computedFn(<T extends JSONObject>(hash: string) => {
  const value = openRoot<T>(hash);
  // value[ON_NEXT](onNext);
  return value;
});

// export const decodeObject = (e: EncodedJSONObject): JSONObject =>
//   Object.fromEntries(
//     Array.from(Object.entries(e)).map(([k, v]) => [k, decodeValue(v)])
//   );
