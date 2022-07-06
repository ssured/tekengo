import "../styling";

import { html, render } from "lit-html";

import { hash } from "../utils/hash";

const name = "world";
const sayHi = html`<h1>Hello ${name}</h1>`;
render(sayHi, document.getElementById("approot")!);
class TestCore {
  constructor() {
    return new Proxy(this, {
      get(target, p) {
        console.log("get", target, p);
        return Reflect.get(target, p);
      },
      set(target, p, v) {
        console.log("set", target, p, v);
        console.log(hash(target as any));
        console.log(JSON.stringify(target));
        const result = Reflect.set(target, p, v);
        console.log(hash(target as any));
        console.log(JSON.stringify(target));
        return result;
      },
    });
  }

  public declare a?: number;
}

const test = new TestCore();
console.log({ test });

console.log(test.a);
test.a = 42;
console.log(test.a);
