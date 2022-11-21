import { dset, dlv } from "../utils/dlvdset";
import full from "./full";
import { ektronProduct, ektronRecord } from "./zodtype";

const common = full.filter((r) => r.type !== "products") as Exclude<
  ektronRecord,
  ektronProduct
>[];
type c = typeof common[number]["type"];

// extract ids
const byId = Object.fromEntries(full.map((r) => [r.id, r] as const));
const byUrl = Object.fromEntries(full.map((r) => [r.url, r] as const));

type ExtractStringPropertyNames<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];
const calenderize = <T, K extends ExtractStringPropertyNames<T>>(
  list: T[],
  key: K
) =>
  list.reduce((calender, entry) => {
    const path /*[year, month, day]*/ = (entry[key] as unknown as string)
      .split(/[^\d]+/, 3)
      .map(Number)
      .map(String);
    dset(calender, path, (dlv(calender, path) || []).concat(entry));
    return calender;
  }, {} as { [year in string]: { [month in string]: { [day in string]: T[] } } });

export default {
  data: byId,
  ["seniorweb.nl"]: byUrl,
  byPublicationDateDesc: common
    .filter(Boolean)
    .sort(
      ({ publicationDate: a }, { publicationDate: b }) => -(a! > b! ? 1 : -1)
    ),
  byModifiedDateDesc: calenderize(common, "modifiedDate"),
  byExpireDate: calenderize(common, "expireDate"),
} as const;
