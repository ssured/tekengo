import "../styling";

import { html, render } from "lit-html";

import { hash, JSONObject } from "../utils/hash";

const name = "world";
const sayHi = html`<h1>Hello ${name}</h1>`;
render(sayHi, document.getElementById("approot")!);

abstract class TestCore<S extends JSONObject> {
  private static getCache = (() => {
    const caches = new WeakMap<object, WeakMap<object, object>>();
    return (cls: object) => {
      if (!caches.has(cls)) caches.set(cls, new WeakMap());
      return caches.get(cls)!;
    };
  })();

  private handlers = new Set<(value: TestCore<S>) => any>();
  $(handler: (value: TestCore<S>) => any) {
    this.handlers.add(handler);
    return this;
    // return () => {
    //   this.handlers.delete(handler);
    // };
  }

  protected mutate(values: { [key in keyof S]: S[key] }) {
    if (this.handlers.size === 0)
      console.error("no handlers, maybe this object already updated");

    const next = new (this.constructor as any)({
      ...this.s,
      "": this.id,
      ...values,
    }) as TestCore<S>;
    for (const handler of this.handlers) {
      if (handler(next)) next.$(handler);
    }
    this.handlers.clear();
  }

  readonly id!: string;
  protected readonly s!: S;

  constructor(source: S) {
    const [id, s] = hash(source);
    // const s = source;

    {
      // check if an object already exists, if so, return that one
      const cache = TestCore.getCache(this.constructor);
      // @ts-ignore
      if (cache.has(s)) return cache.get(s)!;
      cache.set(s, this);
    }

    this.id = id;
    this.s = s;
  }

  public declare a?: number;
}

type coord2d = { x: number; y: number };
type lineShape = { [key in string]: coord2d };

class Point extends TestCore<coord2d> {
  declare $: (handler: (value: Point) => any) => this;
}

class Line extends TestCore<lineShape> {
  declare $: (handler: (value: Line) => any) => this;

  append(p: coord2d) {
    this.mutate({ [Date.now().toString(36)]: p });
    console.log(this.s);
  }

  readonly coords = Object.values(this.s);
}

let line = new Line({}).$((next) => (line = next));

// console.log({ test });

// console.log(test.a);
// test.a = 42;
// console.log(test.a);

document.body.addEventListener("mousemove", (e) => {
  line.append({ x: e.clientX, y: e.clientY });
  console.log(line.id, JSON.stringify(line.coords));
  // console.log(JSON.stringify(line));
});
