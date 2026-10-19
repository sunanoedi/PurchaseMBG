import assert from "node:assert/strict";
import fs from "node:fs";
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
let previous = "";
let count = 0;
for (const locale of ["id", "en"]) {
  const t = JSON.parse(
    fs.readFileSync(new URL(`../content/${locale}.json`, import.meta.url)),
  );
  for (const path of Object.values(t.paths)) {
    const route = `/${locale}${path ? "/" + path : ""}`,
      r = await fetch(new URL(route, base)),
      html = await r.text();
    assert.equal(r.status, 200, route);
    assert.ok(html.includes(`<html lang="${locale}"`));
    const csp = r.headers.get("content-security-policy") || "",
      nonce = csp.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce);
    assert.notEqual(nonce, previous);
    previous = nonce;
    assert.ok(!csp.includes("unsafe-inline") && !csp.includes("unsafe-eval"));
    assert.ok(html.includes(`nonce="${nonce}"`));
    assert.match(r.headers.get("cache-control") || "", /private.*no-store/);
    for (const name of [
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
      "permissions-policy",
      "referrer-policy",
    ])
      assert.ok(r.headers.get(name), name);
    assert.equal(r.headers.get("x-powered-by"), null);
    assert.ok(html.includes('hrefLang="id"') && html.includes('hrefLang="en"'));
    assert.ok(html.includes("og:title"));
    assert.ok(!/hreflang=/i.test(r.headers.get("link") || ""));
    const json = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    )?.[1];
    assert.ok(json);
    assert.equal(JSON.parse(json)["@type"], "LocalBusiness");
    console.log("PASS", route);
    count++;
  }
}
for (const route of [
  "/id/not-found-test",
  "/en/not-found-test",
  "/id/ada.titik",
  "/apiary",
  "/media-kit",
  "/index.html",
]) {
  const r = await fetch(new URL(route, base));
  assert.equal(r.status, 404, route);
  assert.ok(r.headers.get("content-security-policy")?.includes("'nonce-"));
}
const root = await fetch(base, {
  redirect: "manual",
  headers: { "Accept-Language": "en" },
});
assert.equal(new URL(root.headers.get("location"), base).pathname, "/id");
assert.equal(
  (
    await fetch(new URL("/api/quote", base), {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    })
  ).status,
  403,
);
assert.equal(
  (
    await fetch(new URL("/api/preview/enable?locale=id&slug=test", base), {
      redirect: "manual",
    })
  ).status,
  403,
);
assert.equal((await fetch(new URL("/api/quote", base))).status, 405);
for (const route of ["/security.txt", "/.well-known/security.txt"])
  assert.ok(
    (await (await fetch(new URL(route, base))).text()).includes(
      "Expires: 2027-04-19",
    ),
  );
const xml = await (await fetch(new URL("/sitemap.xml", base))).text();
assert.equal((xml.match(/<loc>/g) || []).length, 22);
const image = await fetch(new URL("/og", base));
assert.equal(image.status, 200);
assert.match(image.headers.get("content-type") || "", /image\/png/);
console.log(
  `PASS ${count} bilingual pages, 404, nonce CSP, API guards, metadata, sitemap, security.txt and OG PNG`,
);
for (const path of [
  "/images/nonexistent-test.png",
  "/api/quote",
  "/media/invalid-asset",
]) {
  const response = await fetch(new URL(path, base));
  assert.ok(
    response.headers
      .get("content-security-policy")
      ?.includes("default-src 'none'"),
    `${path}: fallback policy`,
  );
}
console.log("PASS fail-closed CSP on API/asset responses and asset 404");
