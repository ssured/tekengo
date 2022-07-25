export class WeakValue<K extends string, V extends object> extends Map<K, V> {
  // https://github.com/WebReflection/weak-value/blob/fbeb5955e99488d83d5c77f722b81bb6ca8dc006/esm/index.js

  // ISC License

  // Copyright (c) 2020, Andrea Giammarchi, @WebReflection

  // Permission to use, copy, modify, and/or distribute this software for any
  // purpose with or without fee is hereby granted, provided that the above
  // copyright notice and this permission notice appear in all copies.

  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  // REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  // AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  // INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  // LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  // OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  // PERFORMANCE OF THIS SOFTWARE.
  onRemove: ((key: K) => void) | undefined = undefined;

  #delete = (key: K) => {
    this.#registry.unregister(super.get(key) as unknown as WeakRef<V>);
    return super.delete(key);
  };
  #registry = new FinalizationRegistry<K>((key) => {
    super.delete(key);
    this.onRemove?.(key);
  });
  delete(key: K) {
    return super.has(key) && !this.#delete(key);
  }
  has(key: K) {
    let has = super.has(key);
    if (has && !(super.get(key) as unknown as WeakRef<V>).deref())
      has = !!this.#delete(key);
    return has;
  }
  get(key: K) {
    const ref = super.get(key) as unknown as WeakRef<V>;
    return ref && ref.deref();
  }
  set(key: K, value: V) {
    this.delete(key);
    const ref = new WeakRef(value);
    this.#registry.register(value, key, ref);
    return super.set(key, ref as unknown as V);
  }
}
