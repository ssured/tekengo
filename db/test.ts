import { hash, handlers, lookup } from "../utils/hash";
import { Db } from "./db";
// import tree from "./tree";

const db = new Db();

handlers.add(
  (() => {
    return {
      load: (hash) => {
        console.log("loaddb", hash);
        return db.read(hash);
      },
      persist: (object, hash) => {
        console.log("persistdb", hash, object);
        db.persist(hash, object);
      },
      unlink: (hash) => {},
    };
  })()
);

if (false) {
  //   const v = tree; // { value: { test: "Sjoerd" } };
  //   const [sha, testObject] = hash(v as any);
  //   console.log(JSON.stringify(testObject));
  //   console.log("read", db.read(sha));
  //   console.log("lookup", lookup(sha));
  //   console.log("allNodes", db.allNodes().length);
  //   console.log("sha", sha);
}

if (!false) {
  const sha =
    "07a2aa72217882e9d713b82413e5a04d2a29cd8b53ede98a1d85eea486d8d925";
  console.log(
    "lookup",
    JSON.stringify(lookup(sha).byModifiedDateDesc, null, 2)
  );
  //   console.log(
  //     db.inverseProps(
  //       "43b3d3fd41b221eb48cda4e3d9d563ba455808b1a3ed71e067307bafe07ec654"
  //     )
  //   );
  //   console.log(
  //     db
  //       .inverseProp(
  //         "43b3d3fd41b221eb48cda4e3d9d563ba455808b1a3ed71e067307bafe07ec654",
  //         "outer"
  //       )
  //       .map((sha) => lookup(sha))
  //   );
}
