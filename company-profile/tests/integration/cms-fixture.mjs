// Test transport only. Never set NODE_OPTIONS to this file on any deployed application.
import fs from "node:fs";
const dir = process.env.UBG_FIXTURE_DIR;
if (!dir) throw new Error("Integration fixture directory is required");
const original = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  if (url.hostname === "abc123xy.api.sanity.io") {
    const mode = fs.readFileSync(dir + "/state", "utf8");
    if (mode === "outage") throw new Error("Synthetic CMS outage");
    const preview = url.searchParams.get("perspective") === "drafts";
    const records = JSON.parse(fs.readFileSync(dir + "/records.json", "utf8"));
    const result =
      mode === "empty"
        ? []
        : records
            .filter((r) => preview || !r._id.startsWith("drafts."))
            .map((r) =>
              mode === "rename" && r._id === "article-test"
                ? {
                    ...r,
                    slug: {
                      id: { current: "catatan-baru" },
                      en: { current: "new-notes" },
                    },
                  }
                : mode === "badSettings" && r._type === "siteSettings"
                  ? { ...r, mapUrl: "MALFORMED_TEST_URL" }
                  : r,
            );
    return Response.json({ result });
  }
  if (url.hostname === "ubg-fixture.cloudflareaccess.com")
    return Response.json(
      JSON.parse(fs.readFileSync(dir + "/jwks.json", "utf8")),
    );
  if (url.hostname === "cdn.sanity.io") {
    if (fs.readFileSync(dir + "/state", "utf8") === "badImage") {
      return new Response("<svg></svg>", {
        headers: { "Content-Type": "image/png" },
      });
    }
    const data = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1cAAAAASUVORK5CYII=",
      "base64",
    );
    return new Response(data, { headers: { "Content-Type": "image/png" } });
  }
  return original(input, options);
};
