import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readBody, BodyError } from "../src/lib/body.ts";
import {
  csp,
  jsonLd,
  safeLink,
  mapLink,
  securityLog,
} from "../src/lib/security.ts";
import { visibleRecords, imageSchema } from "../src/lib/cms-model.ts";
import { verifyWebhook } from "../src/lib/webhook.ts";
import { encodeSignatureHeader } from "@sanity/webhook";
import { imageMagic, mediaUrl, validMedia } from "../src/lib/media.ts";
import {
  redisUrl,
  redisKey,
  trustedIp,
  quoteConfig,
} from "../src/lib/quote.ts";
const image = {
  alt: { id: "Ilustrasi uji", en: "Test illustration" },
  asset: {
    _id: "image-abcdef123456-100x100-png",
    mimeType: "image/png",
    size: 100,
    metadata: { dimensions: { width: 100, height: 100 } },
  },
};
test("production CSP requires nonce, denies inline/eval and framing", () => {
  const policy = csp("synthetic-nonce");
  assert.match(policy, /'nonce-synthetic-nonce'/);
  assert.match(policy, /'strict-dynamic'/);
  assert.ok(
    !policy.includes("unsafe-inline") && !policy.includes("unsafe-eval"),
  );
  assert.match(policy, /style-src-attr 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
});
test("JSON-LD neutralizes closing script and round-trips content", () => {
  const value = { text: "</script><script>bad\u2028\u2029&" };
  const encoded = jsonLd(value);
  assert.ok(!encoded.includes("<"));
  assert.deepEqual(JSON.parse(encoded), value);
});
test("URL predicates are total and reject unsafe schemes and credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,bad",
    "//untrusted.example",
    "https://a:b@example.com",
    "not a URL",
  ])
    assert.equal(safeLink(url), false);
  assert.equal(safeLink("https://example.com"), true);
  assert.equal(mapLink("not a URL"), false);
  assert.equal(redisUrl("not a URL"), false);
  assert.equal(redisUrl("https://evil-upstash.io"), false);
  assert.equal(redisUrl("https://example.upstash.io"), true);
});
test("logging schema contains no submitted fields", () => {
  const original = console.info;
  const rows: string[] = [];
  console.info = (v) => rows.push(v);
  try {
    securityLog("quote.delivery");
  } finally {
    console.info = original;
  }
  assert.deepEqual(Object.keys(JSON.parse(rows[0])).sort(), [
    "at",
    "event",
    "kind",
    "requestId",
  ]);
});
test("byte limits apply without Content-Length and malformed UTF-8 is rejected", async () => {
  const req = new Request("https://ubg.id", { method: "POST", body: "123456" });
  await assert.rejects(
    () => readBody(req, 3),
    (e: unknown) => e instanceof BodyError && e.status === 413,
  );
  const bad = new Request("https://ubg.id", {
    method: "POST",
    body: new Uint8Array([255]),
  });
  await assert.rejects(
    () => readBody(bad, 10),
    (e: unknown) => e instanceof BodyError && e.status === 400,
  );
});
test("whole-body deadline cancels a slow stream", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("https://ubg.id", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    () => readBody(req, 100, 20),
    (e: unknown) => e instanceof BodyError && e.status === 408,
  );
  assert.equal(cancelled, true);
});
test("a stalled cancellation handshake cannot extend the body deadline", async () => {
  const body = new ReadableStream({
      cancel() {
        return new Promise(() => {});
      },
    }),
    request = new Request("https://ubg.id", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("deadline extended")), 500),
  );
  await assert.rejects(
    () => Promise.race([readBody(request, 100, 20), timeout]),
    (e: unknown) => e instanceof BodyError && e.status === 408,
  );
});
test("JPG/PNG/WebP metadata requires bounded dimensions, bytes and bilingual alt", () => {
  assert.equal(imageSchema.safeParse(image).success, true);
  assert.equal(
    imageSchema.safeParse({ ...image, alt: { id: "", en: "ok" } }).success,
    false,
  );
  for (const asset of [
    { ...image.asset, mimeType: "image/svg+xml" },
    { ...image.asset, size: 6 * 1024 * 1024 },
    { ...image.asset, metadata: { dimensions: { width: 9000, height: 100 } } },
    { ...image.asset, metadata: { dimensions: { width: 6000, height: 6000 } } },
  ])
    assert.equal(imageSchema.safeParse({ ...image, asset }).success, false);
});
test("image byte sniffing rejects SVG/PDF masquerading as PNG", () => {
  assert.equal(
    imageMagic(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"),
    true,
  );
  assert.equal(
    imageMagic(new TextEncoder().encode("<svg></svg>"), "image/png"),
    false,
  );
  assert.equal(
    imageMagic(new TextEncoder().encode("%PDF-1.4"), "image/jpeg"),
    false,
  );
});
test("signed image URLs reject tampering, expiry, mode changes and arbitrary assets", () => {
  const old = process.env.SANITY_ASSET_SIGNING_SECRET;
  process.env.SANITY_ASSET_SIGNING_SECRET = "a".repeat(64);
  try {
    const path = mediaUrl(image.asset._id)!,
      u = new URL(path, "https://ubg.id"),
      exp = u.searchParams.get("expires")!,
      signature = u.searchParams.get("signature")!;
    assert.equal(
      validMedia(image.asset._id, exp, "public", signature, "a".repeat(64)),
      true,
    );
    assert.equal(
      validMedia(image.asset._id, exp, "draft", signature, "a".repeat(64)),
      false,
    );
    assert.equal(
      validMedia("../bad", exp, "public", signature, "a".repeat(64)),
      false,
    );
    assert.equal(
      validMedia(
        image.asset._id,
        exp,
        "public",
        signature,
        "a".repeat(64),
        Number(exp) * 1000 + 1,
      ),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.SANITY_ASSET_SIGNING_SECRET;
    else process.env.SANITY_ASSET_SIGNING_SECRET = old;
  }
});
test("certificates disappear at end of expiry date in Jakarta", () => {
  const row = {
    _id: "certificate-test",
    _type: "certificate",
    verified: true,
    visible: true,
    name: { id: "Uji", en: "Test" },
    issuer: { id: "Uji", en: "Test" },
    number: "TEST",
    expires: "2026-10-19",
    photo: image,
  };
  assert.equal(
    visibleRecords([row], new Date("2026-10-19T16:59:59Z")).length,
    1,
  );
  assert.equal(
    visibleRecords([row], new Date("2026-10-19T17:00:00Z")).length,
    0,
  );
  assert.equal(
    visibleRecords([{ ...row, visible: false }], new Date("2026-10-18")).length,
    0,
  );
  assert.equal(
    visibleRecords([{ ...row, verified: false }], new Date("2026-10-18"))
      .length,
    0,
  );
});
test("public records reject drafts and unverified items", () => {
  const row = {
    _id: "package-test",
    _type: "menuPackage",
    verified: true,
    name: { id: "Uji", en: "Test" },
    description: { id: "Uji", en: "Test" },
    category: "industry",
    items: { id: ["Nasi"], en: ["Rice"] },
  };
  assert.equal(visibleRecords([row]).length, 1);
  assert.equal(
    visibleRecords([{ ...row, _id: "drafts.package-test" }]).length,
    0,
  );
  assert.equal(visibleRecords([{ ...row, visible: false }]).length, 0);
  assert.equal(visibleRecords([{ ...row, verified: false }]).length, 0);
});
test("malformed CMS map URL is validation failure, not an exception", () => {
  assert.deepEqual(
    visibleRecords([
      {
        _id: "settings",
        _type: "siteSettings",
        verified: true,
        phone: "0811665925",
        whatsapp: "62811665925",
        email: "test@example.com",
        address: { id: "Uji", en: "Test" },
        mapUrl: "bad",
      },
    ]),
    [],
  );
});
test("webhook requires valid raw-body signature and fresh timestamp", async () => {
  const secret = "a".repeat(64),
    body = '{"test":true}',
    now = Date.now(),
    sig = await encodeSignatureHeader(body, now, secret);
  assert.equal(await verifyWebhook(body, sig, secret, now), true);
  assert.equal(await verifyWebhook(body + " ", sig, secret, now), false);
  assert.equal(await verifyWebhook(body, sig, secret, now + 300001), false);
  assert.equal(await verifyWebhook(body, sig, secret, now - 60001), false);
  assert.equal(await verifyWebhook(body, "bad", secret, now), false);
});
test("rate keys hide raw IP and rotate per fifteen-minute window", () => {
  const ip = "192.0.2.10";
  assert.ok(!redisKey(ip, "test", 0).includes(ip));
  assert.notEqual(redisKey(ip, "test", 0), redisKey(ip, "test", 900000));
});
test("self-hosted production rejects untrusted forwarded IP", () => {
  const mode = process.env.NODE_ENV,
    vercel = process.env.VERCEL;
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.VERCEL;
  try {
    assert.equal(
      trustedIp(
        new Request("https://ubg.id", {
          headers: {
            "x-real-ip": "192.0.2.10",
            "x-forwarded-for": "192.0.2.10",
          },
        }),
      ),
      null,
    );
  } finally {
    Object.assign(process.env, { NODE_ENV: mode });
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
  }
});
test("malformed rate service environment disables form configuration", () => {
  assert.equal(quoteConfig({ UPSTASH_REDIS_REST_URL: "bad" }), null);
});
test("all bilingual content keys match", () => {
  function keys(v: unknown, path = ""): string[] {
    if (v && typeof v === "object" && !Array.isArray(v))
      return Object.entries(v).flatMap(([k, value]) =>
        keys(value, path + "." + k),
      );
    return [path];
  }
  const id = JSON.parse(
      readFileSync(new URL("../content/id.json", import.meta.url), "utf8"),
    ),
    en = JSON.parse(
      readFileSync(new URL("../content/en.json", import.meta.url), "utf8"),
    );
  assert.deepEqual(keys(id).sort(), keys(en).sort());
});
