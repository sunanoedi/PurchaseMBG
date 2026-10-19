import { defineType, defineField, defineArrayMember } from "sanity";
import id from "../../company-profile/content/id.json";
import en from "../../company-profile/content/en.json";
import { imageSchema } from "../../company-profile/src/lib/cms-model";
import { safeLink, mapLink } from "../../company-profile/src/lib/security";
type Label = keyof typeof id.studio;
const title = (key: Label) => `${id.studio[key]} / ${en.studio[key]}`;
const text = (name: string, label: Label, type = "localizedString") =>
  defineField({
    name,
    title: title(label),
    type,
    validation: (r) => r.required(),
  });
const local = defineType({
  name: "localizedString",
  title: title("name"),
  type: "object",
  fields: [
    defineField({
      name: "id",
      title: id.ui.languageId,
      type: "text",
      rows: 3,
      validation: (r) => r.required().min(1).max(12000),
    }),
    defineField({
      name: "en",
      title: id.ui.languageEn,
      type: "text",
      rows: 3,
      validation: (r) => r.required().min(1).max(12000),
    }),
  ],
});
const image = defineType({
  name: "ubgImage",
  title: title("photo"),
  type: "image",
  options: { accept: "image/jpeg,image/png,image/webp", hotspot: false },
  fields: [text("alt", "alt")],
  validation: (rule) =>
    rule.custom(async (value, context) => {
      if (!value) return true;
      const v = value as { asset?: { _ref?: string }; alt?: unknown };
      if (!v.asset?._ref) return title("assetError");
      try {
        const asset = await context
          .getClient({ apiVersion: "2026-01-01" })
          .fetch("*[_id==$id][0]{_id,mimeType,size,metadata{dimensions}}", {
            id: v.asset._ref,
          });
        return (
          imageSchema.safeParse({ asset, alt: v.alt }).success ||
          title("assetError")
        );
      } catch {
        return title("assetError");
      }
    }),
});
const order = defineField({
  name: "order",
  title: title("order"),
  type: "number",
  initialValue: 0,
  validation: (r) => r.integer().min(0),
});
const visible = defineField({
  name: "visible",
  title: title("visible"),
  type: "boolean",
  initialValue: true,
});
const verified = defineField({
  name: "verified",
  title: title("verified"),
  type: "boolean",
  initialValue: false,
  validation: (r) => r.required(),
});
const category = (values: string[]) =>
  defineField({
    name: "category",
    title: title("category"),
    type: "string",
    options: {
      list: values.map((value) => ({ value, title: title(value as Label) })),
    },
    validation: (r) => r.required(),
  });
const photo = (optional = false) =>
  defineField({
    name: "photo",
    title: title("photo"),
    type: "ubgImage",
    validation: (r) => (optional ? r : r.required()),
  });
const preview = {
  select: { title: "name.id", subtitle: "name.en", media: "photo" },
};
const menuPackage = defineType({
  name: "menuPackage",
  title: title("menuPackage"),
  type: "document",
  fields: [
    text("name", "name"),
    category(["industry", "event"]),
    text("description", "description"),
    defineField({
      name: "items",
      title: title("items"),
      type: "object",
      fields: ["id", "en"].map((locale) =>
        defineField({
          name: locale,
          title: locale === "id" ? id.ui.languageId : id.ui.languageEn,
          type: "array",
          of: [
            defineArrayMember({
              type: "string",
              validation: (r) => r.max(300),
            }),
          ],
          validation: (r) => r.required().min(1).max(30),
        }),
      ),
      validation: (r) => r.required(),
    }),
    photo(true),
    order,
    visible,
    verified,
  ],
  preview,
});
const galleryItem = defineType({
  name: "galleryItem",
  title: title("galleryItem"),
  type: "document",
  fields: [
    photo(),
    category(["dapur", "tim", "hidangan", "acara"]),
    order,
    verified,
  ],
  preview: {
    select: { title: "photo.alt.id", subtitle: "category", media: "photo" },
  },
});
const bodyMember = () =>
  defineArrayMember({
    type: "block",
    styles: [
      { title: title("normal"), value: "normal" },
      { title: title("h2"), value: "h2" },
      { title: title("h3"), value: "h3" },
      { title: title("quote"), value: "blockquote" },
    ],
    lists: [
      { title: title("bullet"), value: "bullet" },
      { title: title("numbered"), value: "number" },
    ],
    marks: {
      decorators: [
        { title: title("bold"), value: "strong" },
        { title: title("italic"), value: "em" },
      ],
      annotations: [
        {
          name: "link",
          title: title("link"),
          type: "object",
          fields: [
            defineField({
              name: "href",
              title: title("url"),
              type: "url",
              validation: (r) =>
                r.required().custom((v) => safeLink(v) || title("url")),
            }),
          ],
        },
      ],
    },
  });
const article = defineType({
  name: "article",
  title: title("article"),
  type: "document",
  fields: [
    text("name", "name"),
    defineField({
      name: "slug",
      title: title("slug"),
      type: "object",
      fields: ["id", "en"].map((locale) =>
        defineField({
          name: locale,
          title: locale === "id" ? id.ui.languageId : id.ui.languageEn,
          type: "slug",
          options: { source: `name.${locale}`, maxLength: 160 },
          validation: (r) =>
            r
              .required()
              .custom(
                (v) =>
                  Boolean(
                    v?.current && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.current),
                  ) || title("slug"),
              ),
        }),
      ),
      validation: (r) => r.required(),
    }),
    text("description", "description"),
    defineField({
      name: "body",
      title: title("body"),
      type: "object",
      fields: ["id", "en"].map((locale) =>
        defineField({
          name: locale,
          title: locale === "id" ? id.ui.languageId : id.ui.languageEn,
          type: "array",
          of: [bodyMember()],
          validation: (r) => r.required().max(500),
        }),
      ),
      validation: (r) => r.required(),
    }),
    photo(),
    defineField({
      name: "publishedAt",
      title: title("publishedAt"),
      type: "datetime",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "status",
      title: title("status"),
      type: "string",
      options: {
        list: [
          { title: title("draft"), value: "draft" },
          { title: title("published"), value: "published" },
        ],
      },
      initialValue: "draft",
      validation: (r) => r.required(),
    }),
    text("seo", "seo"),
    order,
    visible,
    verified,
  ],
  preview,
});
const client = defineType({
  name: "client",
  title: title("client"),
  type: "document",
  fields: [
    text("name", "name"),
    text("region", "region"),
    defineField({ name: "logo", title: title("logo"), type: "ubgImage" }),
    order,
    visible,
    verified,
  ],
  preview: { select: { title: "name.id", subtitle: "name.en", media: "logo" } },
});
const certificate = defineType({
  name: "certificate",
  title: title("certificate"),
  type: "document",
  fields: [
    text("name", "name"),
    text("issuer", "issuer"),
    photo(),
    defineField({
      name: "number",
      title: title("number"),
      type: "string",
      validation: (r) => r.required().max(200),
    }),
    defineField({
      name: "expires",
      title: title("expires"),
      type: "date",
      validation: (r) => r.required(),
    }),
    order,
    visible,
    verified,
  ],
  preview,
});
const siteSettings = defineType({
  name: "siteSettings",
  title: title("siteSettings"),
  type: "document",
  fields: [
    defineField({
      name: "phone",
      title: title("phone"),
      type: "string",
      validation: (r) => r.required().regex(/^[+0-9 ()-]{7,30}$/),
    }),
    defineField({
      name: "whatsapp",
      title: title("whatsapp"),
      type: "string",
      validation: (r) => r.required().regex(/^\d{9,15}$/),
    }),
    defineField({
      name: "email",
      title: title("email"),
      type: "string",
      validation: (r) => r.required().email(),
    }),
    text("address", "address"),
    defineField({
      name: "mapUrl",
      title: title("mapUrl"),
      type: "url",
      validation: (r) =>
        r.custom((value) => !value || mapLink(value) || title("mapUrl")),
    }),
    verified,
  ],
});
export const schemaTypes = [
  local,
  image,
  menuPackage,
  galleryItem,
  article,
  client,
  certificate,
  siteSettings,
];
