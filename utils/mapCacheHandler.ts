import { handler } from "./hash";

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
      // jsonStringCache.delete(hash);
    },
  };
})();
