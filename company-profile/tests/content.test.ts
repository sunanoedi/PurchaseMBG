import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleRecords } from "../src/lib/cms-model.ts";
const photo = {
  alt: { id: "Uji", en: "Test" },
  asset: {
    _id: "image-abcdef123456-100x100-png",
    mimeType: "image/png",
    size: 100,
    metadata: { dimensions: { width: 100, height: 100 } },
  },
};
test("impossible calendar expiry dates are rejected rather than rolled into another month", () => {
  const cert = {
    _id: "cert-test",
    _type: "certificate",
    verified: true,
    name: { id: "Uji", en: "Test" },
    issuer: { id: "Uji", en: "Test" },
    number: "TEST",
    photo,
    expires: "2026-02-31",
  };
  assert.deepEqual(visibleRecords([cert], new Date("2026-02-01")), []);
});
test("unpublished and future articles stay private while bilingual published slugs remain available", () => {
  const article = {
    _id: "article-test",
    _type: "article",
    verified: true,
    name: { id: "Uji", en: "Test" },
    description: { id: "Ringkasan", en: "Summary" },
    slug: { id: { current: "cerita-tim" }, en: { current: "team-story" } },
    body: { id: [], en: [] },
    photo,
    publishedAt: "2026-10-18T00:00:00Z",
    status: "published",
  };
  assert.equal(visibleRecords([article], new Date("2026-10-19")).length, 1);
  assert.equal(
    visibleRecords([{ ...article, status: "draft" }], new Date("2026-10-19"))
      .length,
    0,
  );
  assert.equal(
    visibleRecords(
      [{ ...article, publishedAt: "2099-01-01T00:00:00Z" }],
      new Date("2026-10-19"),
    ).length,
    0,
  );
  assert.equal(
    visibleRecords(
      [{ ...article, _id: "drafts.article-test", status: "draft" }],
      new Date("2026-10-19"),
      true,
    ).length,
    1,
  );
});
