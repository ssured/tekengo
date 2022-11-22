// import { lookup } from "dns";
export default {};
// type JSONValue = null | string | boolean | number | JSONObject | JSONArray;
// type JSONObject = { [key in string]: JSONValue };
// type JSONArray = Array<JSONValue>;

// const computedId = Symbol();

// abstract class Core<T extends JSONObject> {
//   // public static deserialize(serialized: T);

//   public serialize(): T {
//     return JSON.parse(JSON.stringify(this));
//   }

//   private constructor(serialized: T) {
//     const [sha, singleton] = hash(serialized);
//     const self = new Proxy(singleton, {
//       set(t, p, v) {
//         if (p !== computedId && self[computedId]) {
//           revoke(self[computedId]);
//           self[computedId] = null;
//         }
//         return Reflect.set(t, p, v);
//       },
//       get(t, p) {
//         if (Array.isArray(p)) {
//           if (p[0] === 0) return p[1];
//           if (p[0] === 1) return lookup(p[1]); // reference to other object
//         }
//       },
//     });
//     return self;
//   }

//   protected [computedId] = null;
//   get id() {
//     const [sha] = hash(this.serialize);
//     this[computedId] = sha;
//     return sha;
//   }
// }
