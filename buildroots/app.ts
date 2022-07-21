import "../styling";

import { html, render } from "lit-html";

import { hash, JSONObject } from "../utils/hash";

const name = "world";
const sayHi = html`<h1>Hello ${name}</h1>`;
render(sayHi, document.getElementById("approot")!);

abstract class Mould<S extends JSONObject> {
  private static getCache = (() => {
    const caches = new WeakMap<object, WeakMap<object, object>>();
    return (cls: object) => {
      if (!caches.has(cls)) caches.set(cls, new WeakMap());
      return caches.get(cls)!;
    };
  })();

  #handlers = new Set<(value: Mould<S>) => any>();
  $(handler: (value: this) => any): this {
    this.#handlers.add(handler as any);
    return this;
    // return () => {
    //   this.handlers.delete(handler);
    // };
  }

  protected mutate(values: { [key in keyof S]: S[key] }) {
    if (this.#handlers.size === 0)
      console.error("no handlers, maybe this object already updated");

    const next = new (this.constructor as any)({
      ...this.s,
      "": this.id,
      ...Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
          k,
          v instanceof Mould ? v.s : v,
        ])
      ),
    }) as Mould<S>;
    for (const handler of this.#handlers) {
      if (handler(next)) next.$(handler);
    }
    this.#handlers.clear();
    return next;
  }

  readonly id!: string;
  protected readonly s!: S;

  constructor(source: S) {
    const [id, s] = hash(source);
    // const s = source;

    {
      // check if an object already exists, if so, return that one
      const cache = Mould.getCache(this.constructor);
      // @ts-ignore
      if (cache.has(s)) return cache.get(s)!;
      cache.set(s, this);
    }

    this.id = id;
    this.s = s;
  }
}

// type coord2d = { x: number; y: number };
// type lineShape = { [key in string]: coord2d };

class Point extends Mould<{ x: number; y: number }> {
  // declare $: (handler: (value: Point) => any) => this;

  get x() {
    return this.s.x;
  }
  get y() {
    return this.s.y;
  }
}

type ShapeOf<T extends Mould<any>> = T extends Mould<infer Shape>
  ? Shape
  : never;

// type $<O extends Mould<any>> = (handler: (value: O) => any) => O;

class Line extends Mould<{ [key in string]: ShapeOf<Point> }> {
  // declare $: $<this>;

  append(p: Point) {
    return this.mutate({ [Date.now().toString(36)]: p }) as Line;
    // console.log(this.s);
  }

  readonly coords = Object.entries(this.s)
    .filter(([k]) => k !== "")
    .map(([, coord]) => new Point(coord));
}

let line = new Line({}).$((next) => (line = next));

// console.log({ test });

// console.log(test.a);
// test.a = 42;
// console.log(test.a);

document.body.addEventListener("mousemove", (e) => {
  console.log(line.append(new Point({ x: e.clientX, y: e.clientY })).id);
  console.log(line.id, line.coords.length);
  // console.log(JSON.stringify(line));
});
