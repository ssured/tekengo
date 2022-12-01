import { action, createAtom, observable, runInAction, reaction } from "mobx";
import { computedFn } from "mobx-utils";
import { dlv, dset } from "../utils/dlvdset";
import { sha256 } from "../utils/sha256";
import type { DeepReadonly, DeepWritable } from "ts-essentials";
import { string } from "zod";

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
      atom.reportObserved();
      return decodeValue(Reflect.get(source, p));
    },
    ownKeys(source) {
      atom.reportObserved();
      return Reflect.ownKeys(source);
    },
  });
  return singleton;
});

const decodeValue = (e: EncodedJSON): JSONValue => {
  // console.log("decodeValue", e);
  if (typeof e !== "object" || e == null) return e;
  if (Array.isArray(e)) return e.map(decodeValue);
  if (isRef(e)) return getSingleton(e[""]);
  throw new Error("decode invalid object");
};

export const PATH = Symbol();

// const isProxy = (u: JSONValue): u is refProxy =>
//   (typeof u === "object" && u && (u as any)[IS_PROXY]) || false;

type singletonNode<T extends JSONObject> = DeepReadonly<T> & {
  [HASH]: string;
};
type deepWritableNode<T extends JSONObject> = T;
type deepNode<T extends JSONObject> = {
  readonly [K in keyof T]?: T[K] extends JSONObject ? deepNode<T[K]> : T[K];
} & {
  readonly _: DeepWritable<Partial<T>>;
  [PATH]: string[];
};
type rootNode<T extends JSONObject> = deepNode<T> & {
  readonly __: T;
};

const openRoot = computedFn(
  <T extends JSONObject>(
    rootHash: EncodedJSONObjectRef[""],
    mutable: boolean,
    pathstr: string
  ): rootNode<T> => {
    const source = getSingleton(rootHash);
    const sourcePath = JSON.stringify(pathstr);
    const stage = observable.box<EncodedJSONObject | T | undefined>(undefined);

    const node = computedFn(
      (singleton: JSONObject, pathStr: string): deepNode<JSONObject> => {
        const path = JSON.parse(pathStr); // path from root
        return new Proxy(singleton, {
          get(singleton, p) {
            if (typeof p === "symbol") {
              if (p === PATH) return path;
              return Reflect.get(singleton, p);
            }

            const subpath = path.concat(p);

            if (p === "_") {
              /**
               * Het idee is hier om cheap branches aan te bieden
               * met een obj._ krijg je een mutable ref terug, die de wijzigingen
               * opslaat in de obj._.__ property
               * Deze wijzigingen kunnen later opgeslagen worden
               */
              const hash = hashOfSingleton(singleton);
              // console.error({ singleton, hash });
              if (!hash) throw new Error("should have a hash?");
              return openRoot(
                hash,
                !mutable,
                JSON.stringify(sourcePath.concat(subpath))
              );
            }

            const own = Reflect.get(singleton, p);
            const result = (mutable && dlv(stage.get() || {}, subpath)) || own;

            if (hashOfSingleton(result)) {
              return node(result, JSON.stringify(subpath));
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

              /**
               * Deze change wordt
               */
              stage.set(changes);
              console.log("update)");
            });
            return true;
          },
        }) as deepNode<JSONObject>;
      }
    );

    const root = new Proxy(node(source, JSON.stringify([])), {
      get(source, p) {
        if (p === "__") return stage.get(); //{ ...encodeObject(source), ...changes };
        return Reflect.get(source, p);
      },
    }) as any;

    return root;
  }
);

// const decodeRef
export const open = computedFn(<T extends JSONObject>(hash: string) => {
  const value = openRoot<T>(hash, false, JSON.stringify([hash]));
  // value[ON_NEXT](onNext);
  return value;
});

// export const decodeObject = (e: EncodedJSONObject): JSONObject =>
//   Object.fromEntries(
//     Array.from(Object.entries(e)).map(([k, v]) => [k, decodeValue(v)])
//   );
