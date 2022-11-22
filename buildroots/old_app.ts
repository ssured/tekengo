export default {};
// import "../styling";

// import { html, render } from "lit-html";

// import { hash, JSONObject, stats } from "../utils/hash";

// // import data from "./data";
// // window.setTimeout(() => {
// //   console.time("items");
// //   for (const item of data) {
// //     console.log(hash(item));
// //   }
// //   console.time("dataonly");
// //   console.log(hash(data));
// //   console.timeEnd("items");
// //   console.timeEnd("dataonly");

// //   console.time("dataonly");
// //   console.log(hash(data));
// //   console.timeEnd("dataonly");
// // }, 1000);

// const name = "Wieger";
// const sayHi = html`<h1>Hello ${name}</h1>`;
// render(sayHi, document.getElementById("approot")!);

// type Meta = {
//   size: number;
//   prev: string;
//   depth: number;
//   weight: number;
// };
// type Data = JSONObject;
// type AddMeta<S extends Data> = S & { ""?: Meta };

// abstract class Mould<S extends Data> {
//   private static addMeta = (s: AddMeta<Data>, prev?: Mould<Data>): Meta => {
//     const size = JSON.stringify(
//       Object.assign({}, s, { [""]: undefined })
//     ).length;
//     return {
//       size,
//       prev: prev?.id ?? "",
//       depth: (prev?.s[""]?.depth ?? 0) + 1,
//       weight: (prev?.s[""]?.weight ?? 0) + size,
//     };
//   };

//   protected static hash = hash;

//   private static getCache = (() => {
//     const caches = new WeakMap<Function, WeakMap<object, object>>();
//     return (cls: Function) => {
//       if (!caches.has(cls)) caches.set(cls, new WeakMap());
//       return caches.get(cls)!;
//     };
//   })();

//   #handlers = new Set<(value: Mould<any>, remove: () => void) => void | false>([
//     () => {},
//   ]);
//   $(handler: (value: this, remove: () => void) => void | false): this {
//     this.#handlers.add(handler as any);
//     return this;
//     // return () => {
//     //   this.handlers.delete(handler);
//     // };
//   }

//   protected mutate(values: Partial<S>) {
//     const nextS = Object.fromEntries(
//       Object.entries(this.s).concat(Object.entries(values))
//     ) as S;

//     const Ctor = this.constructor as new (object: S) => this;

//     const nextMould: this = new Ctor({
//       [""]: Mould.addMeta(nextS, this),
//       ...nextS,
//     });

//     for (const handler of this.#handlers) {
//       try {
//         const removeHandler = () => {
//           this.#handlers.delete(handler);
//         };
//         const result = handler(nextMould, removeHandler);
//         if (result !== false) {
//           nextMould.$(handler); // register the new handler
//           removeHandler(); // remove the old one
//         }
//       } catch (e) {
//         console.error("Error in update handler", e);
//       }
//     }

//     return nextMould;
//   }

//   readonly id!: string;
//   protected readonly s!: AddMeta<S>;

//   constructor(source: Omit<AddMeta<S>, ""> & Partial<Pick<AddMeta<S>, "">>) {
//     const [id, singleton] = Mould.hash(
//       ("" in source
//         ? source
//         : { [""]: Mould.addMeta(source), ...source }) as AddMeta<S>
//     );

//     // check if an object already exists, if so, return that one
//     const cache = Mould.getCache(this.constructor);
//     // @ts-ignore
//     if (cache.has(singleton)) return cache.get(singleton)!;

//     cache.set(singleton, this);

//     Object.defineProperty(this, "id", { enumerable: false, value: id });
//     Object.defineProperty(this, "s", { enumerable: false, value: singleton });
//   }
// }

// // type coord2d = { x: number; y: number };
// // type lineShape = { [key in string]: coord2d };

// class Point extends Mould<{ x: number; y: number }> {
//   // declare $: (handler: (value: Point) => any) => this;

//   readonly x = this.s.x;
//   readonly y = this.s.y;

//   // get x() {
//   //   return this.s.x;
//   // }
//   // get y() {
//   //   return this.s.y;
//   // }
// }

// type ShapeOf<T extends Mould<any>> = T extends Mould<infer Shape>
//   ? Shape
//   : never;

// // type $<O extends Mould<any>> = (handler: (value: O) => any) => O;

// const filterMetaEntry = <K extends string, V>(
//   entry: [K, V]
// ): entry is [Exclude<K, "">, Exclude<V, Meta>] => entry[0] !== "";

// class Line extends Mould<{ [key in string]: ShapeOf<Point> }> {
//   // declare $: $<this>;

//   append(p: Point) {
//     return this.mutate({ [Date.now().toString(36)]: p });
//     // console.log(this.s);
//   }

//   readonly coords = Object.entries(this.s)
//     .filter(filterMetaEntry)
//     .map(([, coord]) => new Point(coord));
// }

// let line = new Line({}).$((next) => {
//   line = next;
// });

// // console.log({ test });

// // console.log(test.a);
// // test.a = 42;
// // console.log(test.a);

// console.log("started", Date.now());

// document.body.addEventListener("mousemove", (e) => {
//   line.append(new Point({ x: e.clientX, y: e.clientY }));
//   console.log(line.id, line.coords.length, stats());
//   // console.log(JSON.stringify(line));
// });
