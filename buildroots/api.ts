import { JSONObject } from "../utils/hash";

// Idee over hoe een API eruit zou kunnen zien

type hash = string;

export class Bucket {
  add(object: JSONObject): hash {
    return "";
  }

  get(id: hash): JSONObject {
    // returns singleton
    return {};
  }

  onData(handler: (data: object) => void) {}

  onRequest(request: (id: hash, add: Bucket["add"]) => void) {}
}

export class Entry {
  private static createProxy = (obj: JSONObject, path: string[] = []) => {
    return new Proxy(obj, {});
  };
  public data: JSONObject;
  constructor(bucket: Bucket, id: hash) {
    this.data = Entry.createProxy(bucket.get(id));
  }

  onUpdate = (handler: (newId: hash) => void) => {};
}
