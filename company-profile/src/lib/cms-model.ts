import { z } from "zod";
import { mapLink } from "./security.ts";
export const localText = z.object({
  id: z.string().trim().min(1).max(12000),
  en: z.string().trim().min(1).max(12000),
});
export const imageSchema = z.object({
  alt: localText.refine((v) => v.id.length <= 280 && v.en.length <= 280),
  asset: z
    .object({
      _id: z.string().regex(/^image-[a-f0-9]+-\d+x\d+-(jpg|png|webp)$/),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      size: z
        .number()
        .positive()
        .max(5 * 1024 * 1024),
      metadata: z.object({
        dimensions: z.object({
          width: z.number().positive().max(8192),
          height: z.number().positive().max(8192),
        }),
      }),
    })
    .refine(
      (a) =>
        a.metadata.dimensions.width * a.metadata.dimensions.height <=
        25_000_000,
    ),
});
const base = z.object({
  _id: z.string().max(200),
  _type: z.string(),
  order: z.number().optional(),
  visible: z.boolean().optional(),
  verified: z.literal(true),
});
const slug = z.object({
  id: z.object({
    current: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
  }),
  en: z.object({
    current: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160),
  }),
});
const span = z.object({
  _type: z.literal("span"),
  _key: z.string(),
  text: z.string().max(20000),
  marks: z.array(z.string()).optional(),
});
const mark = z.object({
  _type: z.literal("link"),
  _key: z.string(),
  href: z.string().max(2000),
});
const block = z.object({
  _type: z.literal("block"),
  _key: z.string(),
  style: z.enum(["normal", "h2", "h3", "blockquote"]).optional(),
  listItem: z.enum(["bullet", "number"]).optional(),
  level: z.number().min(1).max(4).optional(),
  children: z.array(span).max(500),
  markDefs: z.array(mark).max(100).optional(),
});
const expiry = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });
export const recordSchema = z.discriminatedUnion("_type", [
  base.extend({
    _type: z.literal("menuPackage"),
    name: localText,
    description: localText,
    category: z.enum(["industry", "event"]),
    items: z.object({
      id: z.array(z.string().max(300)).max(30),
      en: z.array(z.string().max(300)).max(30),
    }),
    photo: imageSchema.optional(),
  }),
  base.extend({
    _type: z.literal("galleryItem"),
    category: z.enum(["dapur", "tim", "hidangan", "acara"]),
    photo: imageSchema,
  }),
  base.extend({
    _type: z.literal("client"),
    name: localText,
    region: localText,
    photo: imageSchema.optional(),
  }),
  base.extend({
    _type: z.literal("certificate"),
    name: localText,
    issuer: localText,
    number: z.string().max(200),
    expires: expiry,
    photo: imageSchema,
  }),
  base.extend({
    _type: z.literal("article"),
    name: localText,
    description: localText,
    slug,
    body: z.object({
      id: z.array(block).max(500),
      en: z.array(block).max(500),
    }),
    photo: imageSchema,
    publishedAt: z.iso.datetime({ offset: true }),
    status: z.enum(["draft", "published"]),
    seo: localText.optional(),
  }),
  base.extend({
    _type: z.literal("siteSettings"),
    phone: z.string().regex(/^[+0-9 ()-]{7,30}$/),
    whatsapp: z.string().regex(/^\d{9,15}$/),
    email: z.email().max(254),
    address: localText,
    mapUrl: z.string().refine(mapLink).optional(),
  }),
]);
export type CmsRecord = z.infer<typeof recordSchema>;
export type CmsImage = z.infer<typeof imageSchema>;
export type CmsArticle = Extract<CmsRecord, { _type: "article" }>;
export function visibleRecords(
  records: unknown[],
  now = new Date(),
  preview = false,
): CmsRecord[] {
  return records
    .flatMap((raw) => {
      const parsed = recordSchema.safeParse(raw);
      if (!parsed.success) return [];
      const r = parsed.data;
      if (!preview && (r._id.startsWith("drafts.") || r.visible === false))
        return [];
      if (
        r._type === "certificate" &&
        (!Number.isFinite(Date.parse(r.expires + "T23:59:59+07:00")) ||
          Date.parse(r.expires + "T23:59:59+07:00") < now.getTime())
      )
        return [];
      if (
        r._type === "article" &&
        !preview &&
        (r.status !== "published" || Date.parse(r.publishedAt) > now.getTime())
      )
        return [];
      return [r];
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
