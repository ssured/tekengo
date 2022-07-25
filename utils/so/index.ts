export abstract class SO<T extends object | null | undefined> {
  private static nullObject = {};
  private static getCache = (() => {
    const caches = new WeakMap<object, WeakMap<object, object>>();
    return (cls: typeof SO) => {
      if (!caches.has(cls)) caches.set(cls, new WeakMap());
      return caches.get(cls)!;
    };
  })();

  constructor(protected br: T) {
    const cache = SO.getCache(this.constructor as unknown as typeof SO);
    if (cache.has(br || SO.nullObject))
      // @ts-ignore
      return cache.get(br || SO.nullObject)!;
    cache.set(br || SO.nullObject, this);
  }
}
