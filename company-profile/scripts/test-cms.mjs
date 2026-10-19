// Synthetic local integration test. No live provider accounts, customer data or emails.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { encodeSignatureHeader } from "@sanity/webhook";
const root = fileURLToPath(new URL("..", import.meta.url)),
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ubg-fixture-"));
const base = "http://127.0.0.1:3041",
  secret = "a".repeat(64),
  projectId = "abc123xy",
  dataset = "ubg-fixture";
const image = {
  _type: "image",
  alt: { id: "Ilustrasi uji sintetis", en: "Synthetic test illustration" },
  asset: {
    _id: "image-abcdef123456-1x1-png",
    mimeType: "image/png",
    size: 68,
    metadata: { dimensions: { width: 1, height: 1 } },
  },
};
const text = { id: "Uji sintetis", en: "Synthetic test" };
const body = [
  {
    _type: "block",
    _key: "block1",
    style: "normal",
    markDefs: [{ _key: "bad", _type: "link", href: "javascript:alert(1)" }],
    children: [
      {
        _type: "span",
        _key: "span1",
        text: "<script>synthetic-xss</script>",
        marks: ["bad"],
      },
    ],
  },
];
const article = {
  _id: "article-test",
  _type: "article",
  verified: true,
  visible: true,
  name: { id: "Catatan Uji Tim", en: "Team Test Notes" },
  description: text,
  slug: { id: { current: "catatan-tim" }, en: { current: "team-notes" } },
  body: { id: body, en: body },
  photo: image,
  publishedAt: "2026-01-01T00:00:00Z",
  status: "published",
  seo: text,
};
const records = [
  {
    _id: "settings",
    _type: "siteSettings",
    verified: true,
    phone: "0811665925",
    whatsapp: "62811665925",
    email: "synthetic@example.com",
    address: text,
  },
  {
    _id: "package-test",
    _type: "menuPackage",
    verified: true,
    visible: true,
    name: { id: "Paket Uji Sintetis", en: "Synthetic Test Package" },
    description: text,
    category: "industry",
    items: { id: ["Nasi uji"], en: ["Test rice"] },
    photo: image,
  },
  {
    _id: "package-hidden",
    _type: "menuPackage",
    verified: true,
    visible: false,
    name: { id: "JANGAN TAMPIL", en: "DO NOT SHOW" },
    description: text,
    category: "event",
    items: { id: ["Uji"], en: ["Test"] },
  },
  {
    _id: "gallery-test",
    _type: "galleryItem",
    verified: true,
    category: "dapur",
    photo: image,
  },
  {
    _id: "client-test",
    _type: "client",
    verified: true,
    name: { id: "Klien Sintetis", en: "Synthetic Client" },
    region: { id: "Kawasan Uji", en: "Test Area" },
    photo: image,
  },
  {
    _id: "cert-test",
    _type: "certificate",
    verified: true,
    visible: true,
    name: { id: "Sertifikat Sintetis", en: "Synthetic Certificate" },
    issuer: text,
    number: "TEST-ONLY",
    expires: "2099-01-01",
    photo: image,
  },
  {
    ...article,
    _id: "drafts.article-draft",
    name: { id: "Draf Rahasia Sintetis", en: "Synthetic Private Draft" },
    slug: {
      id: { current: "draf-sintetis" },
      en: { current: "synthetic-draft" },
    },
    status: "draft",
  },
  article,
];
fs.writeFileSync(dir + "/records.json", JSON.stringify(records));
fs.writeFileSync(dir + "/state", "published");
const pair = await generateKeyPair("RS256"),
  publicKey = await exportJWK(pair.publicKey);
fs.writeFileSync(
  dir + "/jwks.json",
  JSON.stringify({ keys: [{ ...publicKey, kid: "fixture", alg: "RS256" }] }),
);
const token = await new SignJWT({ email: "editor@example.com" })
  .setProtectedHeader({ alg: "RS256", kid: "fixture" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .setIssuer("https://ubg-fixture.cloudflareaccess.com")
  .setAudience("fixture-audience")
  .sign(pair.privateKey);
const env = {
  ...process.env,
  NODE_ENV: "production",
  SANITY_PROJECT_ID: projectId,
  SANITY_DATASET: dataset,
  SANITY_READ_TOKEN: "synthetic-read",
  SANITY_PREVIEW_READ_TOKEN: "synthetic-preview",
  SANITY_WEBHOOK_SECRET: secret,
  SANITY_ASSET_SIGNING_SECRET: secret,
  CF_ACCESS_TEAM_DOMAIN: "ubg-fixture.cloudflareaccess.com",
  CF_ACCESS_AUD: "fixture-audience",
  CF_ACCESS_EDITOR_EMAILS: "editor@example.com",
  UBG_FIXTURE_DIR: dir,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import ${path.join(root, "tests/integration/cms-fixture.mjs")}`,
};
const log = fs.openSync(dir + "/server.log", "w");
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3041",
  ],
  { cwd: root, env, stdio: ["ignore", log, log], detached: true },
);
async function get(route, options) {
  return fetch(base + route, options);
}
async function invalidate(tamper = false) {
  const payload = JSON.stringify({
      projectId,
      dataset,
      _type: "article",
      _id: "article-test",
    }),
    signature = await encodeSignatureHeader(payload, Date.now(), secret);
  return get("/api/cms/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "sanity-webhook-signature": signature,
    },
    body: payload + (tamper ? " " : ""),
  });
}
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await get("/api/quote")).status === 405) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "fixture server must start");
  await invalidate();
  for (const [route, needle] of [
    ["/id/paket-menu", "Paket Uji Sintetis"],
    ["/id/klien", "Klien Sintetis"],
    ["/id/sertifikasi-legalitas", "Sertifikat Sintetis"],
    ["/id/artikel", "Catatan Uji Tim"],
  ]) {
    const r = await get(route),
      html = await r.text();
    assert.equal(r.status, 200);
    assert.ok(html.includes(needle), route);
    assert.ok(!html.includes("JANGAN TAMPIL"));
    assert.ok(!html.includes("Draf Rahasia Sintetis"));
    assert.ok(!html.includes(projectId) && !html.includes("synthetic-read"));
  }
  const r = await get("/id/artikel/catatan-tim"),
    html = await r.text();
  assert.equal(r.status, 200);
  assert.ok(html.includes('href="/en/articles/team-notes"'));
  assert.ok(html.includes("&lt;script&gt;synthetic-xss&lt;/script&gt;"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('"@type":"Article"'));
  const imageUrl = html
    .match(/src="(\/media\/[^\"]+)"/)?.[1]
    ?.replaceAll("&amp;", "&");
  assert.ok(imageUrl);
  assert.equal((await get(imageUrl)).status, 200);
  fs.writeFileSync(dir + "/state", "badImage");
  assert.equal((await get(imageUrl)).status, 415);
  fs.writeFileSync(dir + "/state", "published");
  assert.equal(
    (await get(imageUrl.replace("signature=", "signature=0"))).status,
    403,
  );
  assert.equal(
    (
      await get("/api/preview/enable?locale=id&slug=draf-sintetis", {
        redirect: "manual",
      })
    ).status,
    403,
  );
  const enable = await get("/api/preview/enable?locale=id&slug=draf-sintetis", {
    redirect: "manual",
    headers: { "cf-access-jwt-assertion": token },
  });
  assert.equal(enable.status, 307);
  const cookie = enable.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const headers = { Cookie: cookie, "cf-access-jwt-assertion": token };
  const draft = await get("/id/preview/articles/draf-sintetis", { headers }),
    draftHtml = await draft.text();
  assert.equal(draft.status, 200);
  assert.ok(draftHtml.includes("Draf Rahasia Sintetis"));
  assert.match(draft.headers.get("cache-control"), /private.*no-store/);
  assert.equal(
    (
      await get("/id/preview/articles/draf-sintetis", {
        headers: { Cookie: cookie },
      })
    ).status,
    404,
  );
  assert.equal(
    (await get("/id/artikel/draf-sintetis", { headers })).status,
    404,
  );
  const privateImage = draftHtml
    .match(/src="(\/media\/[^\"]+mode=draft[^\"]+)"/)?.[1]
    ?.replaceAll("&amp;", "&");
  assert.ok(privateImage);
  assert.equal((await get(privateImage)).status, 403);
  const photo = await get(privateImage, { headers });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get("cache-control"), "private, no-store");
  assert.equal((await invalidate(true)).status, 401);
  assert.equal((await invalidate()).status, 200);
  fs.writeFileSync(dir + "/state", "rename");
  await invalidate();
  assert.equal((await get("/id/artikel/catatan-tim")).status, 404);
  assert.equal((await get("/id/artikel/catatan-baru")).status, 200);
  assert.ok(
    (await (await get("/sitemap.xml")).text()).includes("catatan-baru"),
  );
  fs.writeFileSync(dir + "/state", "empty");
  await invalidate();
  assert.equal((await get("/id/artikel/catatan-baru")).status, 404);
  assert.ok(
    !(await (await get("/id/paket-menu")).text()).includes(
      "<h2>Sajian Harian Tim</h2>",
    ),
  );
  assert.equal(
    ((await (await get("/sitemap.xml")).text()).match(/<loc>/g) || []).length,
    22,
  );
  fs.writeFileSync(dir + "/state", "outage");
  await invalidate();
  const fallback = await get("/id/paket-menu");
  assert.equal(fallback.status, 200);
  assert.ok((await fallback.text()).includes("<h2>Sajian Harian Tim</h2>"));
  fs.writeFileSync(dir + "/state", "badSettings");
  await invalidate();
  const contact = await get("/id/kontak");
  assert.equal(contact.status, 200);
  assert.ok(!(await contact.text()).includes("MALFORMED_TEST_URL"));
  console.log(
    "PASS synthetic CMS types, visibility, localized slugs/SEO, safe PortableText, signed images, editor JWT/cookie/draft/private photo, webhook tamper, rename/unpublish/sitemap and outage fallback",
  );
} finally {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
  fs.closeSync(log);
  fs.rmSync(dir, { recursive: true, force: true });
}
