import assert from "node:assert/strict";
const base = new URL(process.argv[2] || "http://127.0.0.1:3000");
assert.ok(!base.username && !base.password);
assert.ok(
  base.protocol === "https:" ||
    (base.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(base.hostname)),
);
let previous = "";
for (const path of [
  "/id",
  "/id",
  "/en",
  "/id/not.found",
  "/apiary",
  "/media-kit",
]) {
  const r = await fetch(new URL(path, base), {
      signal: AbortSignal.timeout(15000),
    }),
    html = await r.text();
  assert.equal(new URL(r.url).origin, base.origin);
  assert.equal(r.status, ["/id", "/en"].includes(path) ? 200 : 404);
  const p = r.headers.get("content-security-policy") || "",
    nonce = p.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce && nonce.length >= 24);
  assert.notEqual(nonce, previous);
  previous = nonce;
  assert.ok(html.includes(`nonce="${nonce}"`));
  for (const rule of [
    "'strict-dynamic'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "style-src-attr 'none'",
  ])
    assert.ok(p.includes(rule));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(p));
  assert.match(r.headers.get("cache-control") || "", /private.*no-store/);
  assert.ok(
    Number(
      r.headers.get("strict-transport-security")?.match(/max-age=(\d+)/)?.[1],
    ) >= 31536000,
  );
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(
    r.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assert.ok(r.headers.get("permissions-policy")?.includes("camera=()"));
  assert.equal(r.headers.get("x-powered-by"), null);
  assert.ok(!/hreflang=/i.test(r.headers.get("link") || ""));
  console.log("PASS", path);
}
assert.equal((await fetch(new URL("/index.html", base))).status, 404);
const foreign = await fetch(new URL("/api/quote", base), {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(foreign.status, 403);
assert.equal(foreign.headers.get("access-control-allow-origin"), null);
const preview = await fetch(
  new URL("/api/preview/enable?locale=id&slug=synthetic", base),
  { redirect: "manual" },
);
assert.equal(preview.status, 403);
assert.equal(preview.headers.get("set-cookie"), null);
const spoof = await fetch(new URL("/id", base), {
  headers: { "x-forwarded-host": "untrusted.example" },
});
assert.ok((await spoof.text()).includes('href="https://ubg.id/id"'));
assert.ok(!(spoof.headers.get("link") || "").includes("untrusted.example"));
console.log(
  "PASS legacy separation, quote origin/CORS, anonymous preview and pinned canonical",
);
