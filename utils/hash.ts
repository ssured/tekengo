import { sha256 } from "./sha256.js";
import { WeakValue } from "./weak-value.js";

export type JSONObject<T = never> = { [x: string]: JSONValue<T> };
export type JSONArray<T = never> = Array<JSONValue<T>>;
export type JSONPrimitive<T = never> = null | string | number | boolean | T;
export type JSONValue<T = never> =
  | JSONPrimitive<T>
  | JSONObject<T>
  | JSONArray<T>;

type TransformedObjectRef = [string];
type TransformedArray = [TransformedValue[]];
type TransformedValue = JSONPrimitive | TransformedObjectRef | TransformedArray;
type TransformedObject = {
  [x: string]: TransformedValue;
};

//
const mapCacheHandler: handler = (() => {
  const jsonStringCache = new Map<string, string>();
  return {
    load: (hash) => {
      const stringified = jsonStringCache.get(hash);
      if (stringified) {
        console.log("load", hash);
        return JSON.parse(stringified);
      }
    },
    persist: (object, hash) => {
      console.log("persist", hash);
      jsonStringCache.set(hash, JSON.stringify(object));
    },
    unlink: (hash) => {
      console.log("removed", hash, JSON.parse(jsonStringCache.get(hash)!));
      jsonStringCache.delete(hash);
    },
  };
})();

type handler = {
  load?: (hash: string) => TransformedObject | undefined | void;
  persist?: (object: TransformedObject, hash: string) => void;
  unlink?: (hash: string) => void;
};

export const handlers = new Set<handler>([mapCacheHandler]);

export const { hash, lookup, stats } = (() => {
  const hashCache = new WeakMap<JSONObject, readonly [string, JSONObject]>();
  const singletonForHash = new WeakValue<string, JSONObject>();
  singletonForHash.onRemove = (hash: string) => {
    for (const { unlink } of handlers) {
      try {
        unlink?.(hash);
      } catch (e) {}
    }
  };

  function lookupHash(hash: string) {
    if (!singletonForHash.has(hash)) {
      for (const { load } of handlers) {
        try {
          const result = load?.(hash);
          if (result === undefined) continue;

          const obj = untransformObject(result);
          singletonForHash.set(hash, obj);
          return obj;
        } catch (e) {}
      }
      throw new HashNotFoundError();
    }
    return singletonForHash.get(hash)!;
  }

  function transform(source: JSONValue): TransformedValue {
    if (typeof source !== "object" || source == null) return source;

    if (Array.isArray(source)) return [source.map((item) => transform(item))];

    return [hash(source)[0]];
  }

  function transformObject(source: JSONObject): TransformedObject {
    return Object.fromEntries(
      Object.entries(source).map(([k, v]) => [k, transform(v)])
    );
  }

  const handlersForObject = new WeakMap<
    object,
    Set<(nextHash: string, key: string) => void>
  >();

  const hashResolver: ProxyHandler<object> = {
    get(target, key) {
      return untransform(Reflect.get(target, key));
    },
    set(target, p, value) {
      if (typeof p === "string") {
        const nextHash = rawHash(
          // Object.assign(Object.create(target),
          {
            ...target,
            [p]: transform(value),
          }
        )[0];

        for (const handler of handlersForObject.get(target) ?? [])
          handler(nextHash, p);
      } else {
        return Reflect.set(target, p, value);
      }
      return true;
    },
    apply(
      target,
      thisArg,
      argArray: [(nextHash: string, key: string) => void]
    ) {
      if (typeof argArray !== "function" || (argArray as () => {}).length !== 2)
        throw new Error("must provide handler function");

      let handlers!: Set<(nextHash: string, key: string) => void>;
      if (!handlersForObject.has(target))
        handlersForObject.set(target, (handlers = new Set()));
      handlers = handlers || handlersForObject.get(target)!;

      handlers.add(argArray[0]);
      return () => handlers.delete(argArray[0]);
    },
  };

  // JSON.stringify(Object.assign(Object.create({a: 'A', toJSON() {
  //     const keys = new Set();
  //     for (let current = this; current; current = Object.getPrototypeOf(current))
  //       for (const key of Object.getOwnPropertyNames(current)) keys.add(key);
  //     return Object.fromEntries([...keys].sort().filter(k => k !== '__proto__').map(k => [k, this[k]]));
  // } }), {b:'B'}))

  const proxyCache = new WeakMap();
  let proxyCount = 0;
  function createProxy<T extends object>(source: T): T {
    if (!proxyCache.has(source)) {
      proxyCount++;
      proxyCache.set(source, new Proxy(source, hashResolver));
    }
    return proxyCache.get(source)!;
  }

  function untransform(
    source: TransformedValue
  ): Parameters<typeof transform>[0] {
    if (typeof source !== "object" || source == null) return source;

    const firstItem = source[0];

    if (typeof firstItem === "string") {
      return lookupHash(firstItem)!;
    }

    return createProxy(firstItem);
  }

  function untransformObject(source: TransformedObject): JSONObject {
    return Object.fromEntries(
      Object.entries(source).map(([k, v]) => [k, untransform(v)])
    );
  }

  function createSingleton(
    source: ReturnType<typeof transformObject>
  ): Parameters<typeof transformObject>[0] {
    return createProxy(source);
  }

  function rawHash<O extends TransformedObject>(
    transformed: O
  ): readonly [
    string,
    O /* & { (onNextHash: (nextHash: string, key: string) => void): () => void } */
  ] {
    if (hashCache.has(transformed)) return hashCache.get(transformed)! as any;

    const hash = sha256(JSON.stringify(transformed)) as string;

    const singleton =
      singletonForHash.get(hash) || createSingleton(transformed);
    const result = [hash, singleton as O] as any;

    if (!singletonForHash.has(hash)) {
      for (const { persist } of handlers) {
        persist?.(transformed, hash);
      }
      singletonForHash.set(hash, singleton);
      hashCache.set(singleton, result);
    }

    hashCache.set(transformed, result);
    return result;
  }

  function hash<O extends JSONObject>(source: O): readonly [string, O] {
    // if (hashCache.has(source)) return hashCache.get(source)! as any;

    const transformed = transformObject(source);

    const result = rawHash(transformed) as any;

    hashCache.set(source, result);
    return result;
  }

  function lookup(hash: string): JSONObject {
    const result = singletonForHash.get(hash);
    if (result == null) throw new HashNotFoundError(hash);
    if (Array.isArray(result)) throw new HashIsArrayError(hash);
    return result;
  }

  return {
    hash,
    lookup,
    stats() {
      return {
        singletonCount: singletonForHash.size,
        proxyCount,
      };
    },
  };
})();

export class HashNotFoundError extends Error {}
export class HashIsArrayError extends Error {}

// export const { hash, lookup, stats } = (() => {
//   enum ValueType {
//     Value = 0,
//     HashedArrayItem = 1,
//     HashedObjectValue = 2,
//   }

//   const objForHash = new WeakValue<string, JSONObject | JSONArray>();
//   const hashForObj = new WeakMap<object, string>();

//   function transform(obj: JSONArray | JSONObject): [string] | [string[]] {
//     return Array.isArray(obj)
//       ? [obj.map((v) => hashVal(v)[0])]
//       : Object.fromEntries(
//           Object.entries(obj).map(([k, v]) => [
//             k,
//             [ValueType.HashedObjectValue, hashVal(v)[0]] as const,
//           ])
//         );
//   }

//   function resolve(
//     obj: ReturnType<typeof transform>
//   ): Parameters<typeof transform>[0] {
//     return Object.freeze(
//       Object.fromEntries(
//         Object.entries(obj).map(([k, v]) => {
//           if (typeof v !== "object" || v === null) return [k, v];
//           return [k, objForHash.get(hashForObj.get(v)!)!];
//         })
//       )
//     );
//   }

//   function hashVal<T extends JSONValue>(obj: T): [string, T] {
//     if (typeof obj !== "object" || obj === null)
//       return [sha256(JSON.stringify([ValueType.Value, obj])), obj];

//     let hash: string;
//     if (hashForObj.has(obj)) {
//       hash = hashForObj.get(obj)!;
//     } else {
//       const transformed = transform(obj);
//       hash = sha256(JSON.stringify([ValueType.Value, transformed]));
//       hashForObj.set(obj, hash);
//     }

//     if (!objForHash.has(hash)) {
//       const result = resolve(transform(obj));
//       objForHash.set(hash, result);
//       hashForObj.set(result, hash);
//     }

//     return [hash, objForHash.get(hash)! as T];
//   }

//   function lookup(hash: string): JSONObject {
//     const result = objForHash.get(hash);
//     if (result == null) throw new HashNotFoundError(hash);
//     if (Array.isArray(result)) throw new HashIsArrayError(hash);
//     return result;
//   }

//   return {
//     hash<T extends JSONObject>(value: T): [string, Readonly<T>] {
//       return hashVal(value);
//     },
//     lookup(hash: string): JSONObject {
//       const result = objForHash.get(hash);
//       if (result == null) throw new HashNotFoundError(hash);
//       if (Array.isArray(result)) throw new HashIsArrayError(hash);
//       return result;
//     },
//     stats() {
//       return {
//         hashCount: objForHash.size,
//       };
//     },
//   };
// })();
