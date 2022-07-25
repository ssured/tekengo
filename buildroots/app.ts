import "../styling";

import { html, render } from "lit-html";

import { hash, JSONObject, stats } from "../utils/hash";
import { WeakValue } from "../utils/weak-value";

const name = "Wieger";
const sayHi = html`<h1>Hello ${name}</h1>`;
render(sayHi, document.getElementById("approot")!);

type Meta = {
  size: number;
  prev: string;
  depth: number;
  weight: number;
  message?: {};
};
type Data = JSONObject;

abstract class Mould<S extends Data> {
  private static vault = new WeakValue<string, Mould<Data>>();

  private static createMeta = (
    s: Data,
    message?: Meta["message"],
    prev?: Mould<any>
  ): Meta => {
    const size = JSON.stringify(s).length;
    return {
      message,
      size,
      prev: prev?.id ?? "",
      depth: (prev?.m.depth ?? 0) + 1,
      weight: (prev?.m.weight ?? 0) + size,
    };
  };

  protected static hash = hash;

  private static getCache = (() => {
    const caches = new WeakMap<Function, WeakMap<object, object>>();
    return (cls: Function) => {
      if (!caches.has(cls)) caches.set(cls, new WeakMap());
      return caches.get(cls)!;
    };
  })();

  #handlers = new Set<(value: Mould<any>, remove: () => void) => void | false>([
    () => {},
  ]);
  $(handler: (value: this, remove: () => void) => void | false): this {
    this.#handlers.add(handler as any);
    return this;
    // return () => {
    //   this.handlers.delete(handler);
    // };
  }

  protected mutate(values: Partial<S>) {
    const nextS = Object.fromEntries(
      Object.entries(this.s).concat(Object.entries(values))
    ) as S;

    const Ctor = this.constructor as new (object: { m: Meta; s: S }) => this;

    const nextMould: this = new Ctor({
      m: Mould.createMeta(nextS, this),
      s: nextS,
    });

    for (const handler of this.#handlers) {
      try {
        const removeHandler = () => {
          this.#handlers.delete(handler);
        };
        const result = handler(nextMould, removeHandler);
        if (result !== false) {
          nextMould.$(handler); // register the new handler
          removeHandler(); // remove the old one
        }
      } catch (e) {
        console.error("Error in update handler", e);
      }
    }

    return nextMould;
  }

  readonly id!: string;
  protected readonly s!: S;
  protected readonly m!: Meta;

  constructor(s: S, m: Meta = Mould.createMeta(s)) {
    const [id, { m: singleM, s: singleton }] = Mould.hash({ m, s });

    // check if an object already exists, if so, return that one
    const cache = Mould.getCache(this.constructor);
    // @ts-ignore
    if (cache.has(singleton)) return cache.get(singleton)!;

    cache.set(singleton, this);

    this.id = id;
    this.s = singleton;
    this.m = singleM;
  }
}

// type coord2d = { x: number; y: number };
// type lineShape = { [key in string]: coord2d };

class Point extends Mould<{ x: number; y: number }> {
  // declare $: (handler: (value: Point) => any) => this;

  readonly x = this.s.x;
  readonly y = this.s.y;

  // get x() {
  //   return this.s.x;
  // }
  // get y() {
  //   return this.s.y;
  // }
}

type ShapeOf<T extends Mould<any>> = T extends Mould<infer Shape>
  ? Shape
  : never;

// type $<O extends Mould<any>> = (handler: (value: O) => any) => O;

class Line extends Mould<{ [key in string]: ShapeOf<Point> }> {
  // declare $: $<this>;

  append(p: Point) {
    return this.mutate({ [Date.now().toString(36)]: p });
    // console.log(this.s);
  }

  readonly coords = Object.entries(this.s)
    .filter(([k]) => k !== "")
    .map(([, coord]) => new Point(coord));
}

let line = new Line({}).$((next) => {
  console.log({ next });
  line = next;
});

// console.log({ test });

// console.log(test.a);
// test.a = 42;
// console.log(test.a);

console.log("started", Date.now());

document.body.addEventListener("mousemove", (e) => {
  line.append(new Point({ x: e.clientX, y: e.clientY }));
  console.log(line.id, line.coords.length, stats());
  // console.log(JSON.stringify(line));
});
