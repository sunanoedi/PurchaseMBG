import { z } from "zod";
import { readBody, BodyError } from "./body.ts";
const single = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v));
export const quoteSchema = z
  .object({
    name: single(100),
    company: z
      .string()
      .trim()
      .max(150)
      .refine((v) => !/[\u0000-\u001f\u007f]/.test(v))
      .default(""),
    email: z.email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ()-]{7,30}$/),
    service: z.enum(["industry", "event"]),
    portions: z.number().int().min(1).max(100000),
    message: z
      .string()
      .trim()
      .min(5)
      .max(3000)
      .refine((v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)),
    consent: z.literal(true),
    website: z.string().max(200),
    token: z.string().min(1).max(2048),
  })
  .strict();
export type Enquiry = z.infer<typeof quoteSchema>;
export function apiJson(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}
export type QuoteAdapters = {
  configured: boolean;
  ip: string | null;
  limit: () => Promise<boolean>;
  captcha: (token: string) => Promise<boolean>;
  deliver: (data: Enquiry) => Promise<void>;
  origins: string[];
  log: (
    event: "quote.config" | "quote.rate" | "quote.captcha" | "quote.delivery",
  ) => void;
};
export async function handleQuote(request: Request, adapters: QuoteAdapters) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    !adapters.origins.includes(origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return apiJson({ code: "origin" }, 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return apiJson({ code: "contentType" }, 415);
  let raw;
  try {
    raw = JSON.parse(await readBody(request, 16384));
  } catch (error) {
    return apiJson(
      { code: "validation" },
      error instanceof BodyError ? error.status : 400,
    );
  }
  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) return apiJson({ code: "validation" }, 400);
  if (parsed.data.website) return apiJson({ ok: true }, 202);
  if (!adapters.configured || !adapters.ip) {
    adapters.log("quote.config");
    return apiJson({ code: "unavailable" }, 503);
  }
  try {
    if (!(await adapters.limit()))
      return apiJson({ code: "rate" }, 429, { "Retry-After": "900" });
  } catch {
    adapters.log("quote.rate");
    return apiJson({ code: "unavailable" }, 503);
  }
  try {
    if (!(await adapters.captcha(parsed.data.token)))
      return apiJson({ code: "validation" }, 400);
  } catch {
    adapters.log("quote.captcha");
    return apiJson({ code: "unavailable" }, 503);
  }
  try {
    await adapters.deliver(parsed.data);
  } catch {
    adapters.log("quote.delivery");
    return apiJson({ code: "unavailable" }, 503);
  }
  return apiJson({ ok: true });
}
export function emailBody(data: Enquiry) {
  return `UBG quotation enquiry\n\nName: ${data.name}\nCompany: ${data.company}\nEmail: ${data.email}\nPhone: ${data.phone}\nService: ${data.service}\nPortions: ${data.portions}\n\n${data.message}\n\nConsent: yes`;
}
