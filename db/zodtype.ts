import full from "./full";
import { z } from "zod";

const image = z.object({
  src: z.string(),
  alt: z.string(),
});
const iso8601 = z
  .string()
  .regex(
    /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?(Z|[+-](?:2[0-3]|[01][0-9]):[0-5][0-9])?$/
  );

const common = {
  id: z.number(),
  title: z.string(),
  url: z.string().min(1),
  image: image.nullable(),
  publicationDate: iso8601.nullable(),
  modifiedDate: iso8601,
  expireDate: iso8601,
  status: z.literal("Active"),
  isPublished: z.literal(true),
  relatedContentIds: z.array(z.number()),
} as const;

// creating a schema for strings
const recordSchema = z.union([
  z.object({
    type: z.union([z.literal("articles"), z.literal("tips")]),
    header: z.object({
      title: z.string(),
      image: image.nullable(),
      intro: z.string(),
    }),
    properties: z.object({
      level: z.number(),
      operatingSystem: z.string(),
      requirements: z.array(z.string()),
      author: z.string(),
      cssClass: z.null(),
      rating: z.object({
        votes: z.number().min(0),
        total: z.number().min(0),
        cmsVotes: z.number().min(0),
        cmsTotal: z.number().min(0),
        swVotes: z.number().min(0),
        swTotal: z.number().min(0),
      }),
    }),
    steps: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        imageSmall: image.nullable(),
        imageLarge: image.nullable(),
      })
    ),
    intro: z.string(),
    ...common,
  }),
  z.object({
    type: z.literal("dictionary"),
    text: z.string(),
    mP3: z.string(),
    ogg: z.string(),
    category: z.string(),
    ...common,
  }),
  z.object({
    type: z.literal("news"),
    text: z.string(),
    ...common,
  }),
  z.object({
    type: z.literal("products"),
    intro: z.string(),
    description: z.string(),
    html: z.string(),
    category: z.string(),
    stockStatus: z.literal("InStock"),
    listPrice: z.number(),
    salesPrice: z.number(),
    discountPrice: z.number(),
    images: z.array(
      z.object({
        id: z.number(),
        filePath: z.string(),
        fileName: z.string(),
        height: z.number(),
        width: z.number(),
        title: z.string(),
        thumbnails: z.array(z.unknown()),
      })
    ),
    id: common.id,
    title: common.title,
    url: common.url,
  }),
  z.object({
    type: z.literal("software"),
    header: z.object({
      title: z.string(),
      image: image.nullable(),
      intro: z.string(),
    }),
    properties: z.object({
      author: z.string(),
      operatingSystem: z.string(),
      fileSize: z.string(),
      url: z.string(),
      language: z.number(),

      rating: z.object({
        votes: z.number().min(0),
        total: z.number().min(0),
        cmsVotes: z.number().min(0),
        cmsTotal: z.number().min(0),
        swVotes: z.number().min(0),
        swTotal: z.number().min(0),
      }),
    }),
    steps: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        imageSmall: image.nullable(),
        imageLarge: image.nullable(),
      })
    ),
    intro: z.string(),
    ...common,
  }),
]);

// parsing
for (const record of full) {
  const result = recordSchema.safeParse(record);
  if (result.success) continue;

  console.log(record);
  console.log(filterErrors(result.error));

  break;
}

export type ektronRecord = z.infer<typeof recordSchema>;
// export type recordTypes = ektronRecord["type"];
export type ektronArticle = ektronRecord & { type: "articles" };
export type ektronTip = ektronRecord & { type: "tips" };
export type ektronDictionary = ektronRecord & { type: "dictionary" };
export type ektronNews = ektronRecord & { type: "news" };
export type ektronProduct = ektronRecord & { type: "products" };
export type ektronSoftware = ektronRecord & { type: "software" };

function filterErrors(error: any) {
  return {
    ...error,
    issues: (error.issues || []).map((issue: any) => {
      if (issue.code !== "invalid_union") return issue;

      return {
        ...issue,
        unionErrors: (issue.unionErrors || [])
          .filter((error: any) => {
            return (
              error.issues.find(
                (issue: any) => issue.code === "invalid_literal"
              ) == null
            );
          })
          .map(filterErrors),
      };
    }),
  };
}
