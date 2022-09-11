import { hash, handlers, lookup } from "../utils/hash";
import { Db } from "./db";

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
  const [sha, testObject] = hash({ outer: { value: { test: "Sjoerd" } } });

  console.log(JSON.stringify(testObject));

  console.log("read", db.read(sha));
  console.log("lookup", lookup(sha));

  console.log("allNodes", db.allNodes());
}

if (!false) {
  const sha =
    "c8aa56d3b2cf67fd4f455bb925edc7127eaedadb1069f37248fb5aab800efde3";
  console.log("lookup", lookup(sha));
  console.log(
    db.inverseProps(
      "43b3d3fd41b221eb48cda4e3d9d563ba455808b1a3ed71e067307bafe07ec654"
    )
  );
  console.log(
    db.inverseProp(
      "43b3d3fd41b221eb48cda4e3d9d563ba455808b1a3ed71e067307bafe07ec654",
      "outer"
    )
  );
}
