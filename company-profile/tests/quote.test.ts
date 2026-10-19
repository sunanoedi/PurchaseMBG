import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleQuote,
  emailBody,
  quoteSchema,
  type QuoteAdapters,
} from "../src/lib/quote-core.ts";
const enquiry = {
  name: "Test Operator",
  company: "Test Only",
  email: "test@example.com",
  phone: "0811665925",
  service: "industry",
  portions: 100,
  message: "Synthetic test enquiry",
  consent: true,
  website: "",
  token: "synthetic-captcha",
};
const request = (
  data: unknown = enquiry,
  origin = "https://ubg.id",
  type = "application/json",
) =>
  new Request("https://ubg.id/api/quote", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": type },
    body: JSON.stringify(data),
  });
function adapters(changes: Partial<QuoteAdapters> = {}) {
  const state = { sent: 0, captcha: 0, limited: 0 };
  const value: QuoteAdapters = {
    configured: true,
    ip: "192.0.2.10",
    origins: ["https://ubg.id"],
    log: () => {},
    limit: async () => {
      state.limited++;
      return true;
    },
    captcha: async () => {
      state.captcha++;
      return true;
    },
    deliver: async (data) => {
      assert.equal(data.email, enquiry.email);
      state.sent++;
    },
    ...changes,
  };
  return { value, state };
}
test("a validated enquiry reaches delivery once and response contains no submitted data", async () => {
  const a = adapters(),
    res = await handleQuote(request(), a.value);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(a.state.sent, 1);
});
test("foreign, missing and deceptive origins fail before providers", async () => {
  for (const origin of [
    "",
    "https://ubg.id.attacker.example",
    "https://untrusted.example",
  ]) {
    const a = adapters();
    assert.equal(
      (await handleQuote(request(enquiry, origin), a.value)).status,
      403,
    );
    assert.equal(a.state.sent + a.state.captcha + a.state.limited, 0);
  }
});
test("cross-site fetch metadata is rejected", async () => {
  const r = request();
  r.headers.set("sec-fetch-site", "cross-site");
  assert.equal((await handleQuote(r, adapters().value)).status, 403);
});
test("JSON content type is required", async () => {
  assert.equal(
    (
      await handleQuote(
        request(enquiry, "https://ubg.id", "text/plain"),
        adapters().value,
      )
    ).status,
    415,
  );
});
test("invalid input and unknown fields cannot reach providers", async () => {
  for (const data of [
    { ...enquiry, name: "a".repeat(101) },
    { ...enquiry, name: "Injected\r\nBcc: nope" },
    { ...enquiry, email: "bad" },
    { ...enquiry, portions: 0 },
    { ...enquiry, portions: 1.5 },
    { ...enquiry, consent: false },
    { ...enquiry, service: "unexpected" },
    { ...enquiry, message: "a".repeat(3001) },
    { ...enquiry, html: "bad" },
  ]) {
    const a = adapters();
    assert.equal((await handleQuote(request(data), a.value)).status, 400);
    assert.equal(a.state.sent + a.state.captcha + a.state.limited, 0);
  }
});
test("honeypot success does not send an email or call CAPTCHA", async () => {
  const a = adapters();
  assert.equal(
    (await handleQuote(request({ ...enquiry, website: "bot" }), a.value))
      .status,
    202,
  );
  assert.equal(a.state.sent + a.state.captcha + a.state.limited, 0);
});
test("missing configuration or trusted IP fails closed", async () => {
  for (const change of [{ configured: false }, { ip: null }]) {
    const a = adapters(change);
    assert.equal((await handleQuote(request(), a.value)).status, 503);
    assert.equal(a.state.sent, 0);
  }
});
test("rate limit returns 429 and Retry-After before CAPTCHA", async () => {
  const a = adapters({ limit: async () => false }),
    r = await handleQuote(request(), a.value);
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("retry-after"), "900");
  assert.equal(a.state.captcha + a.state.sent, 0);
});
test("rate service outage fails closed", async () => {
  const a = adapters({
    limit: async () => {
      throw new Error("synthetic");
    },
  });
  assert.equal((await handleQuote(request(), a.value)).status, 503);
  assert.equal(a.state.sent, 0);
});
test("invalid or unavailable CAPTCHA cannot deliver", async () => {
  for (const captcha of [
    async () => false,
    async () => {
      throw new Error("synthetic");
    },
  ]) {
    const a = adapters({ captcha });
    assert.ok(
      [400, 503].includes((await handleQuote(request(), a.value)).status),
    );
    assert.equal(a.state.sent, 0);
  }
});
test("email failure is never reported as success", async () => {
  assert.equal(
    (
      await handleQuote(
        request(),
        adapters({
          deliver: async () => {
            throw new Error("synthetic");
          },
        }).value,
      )
    ).status,
    503,
  );
});
test("malformed and oversized JSON is rejected", async () => {
  for (const [body, status] of [
    ["{", 400],
    ["x".repeat(17000), 413],
  ] as const) {
    const r = new Request("https://ubg.id/api/quote", {
      method: "POST",
      headers: { Origin: "https://ubg.id", "Content-Type": "application/json" },
      body,
    });
    assert.equal((await handleQuote(r, adapters().value)).status, status);
  }
});
test("email transport uses plain text; markup cannot become HTML email", () => {
  const data = quoteSchema.parse({
    ...enquiry,
    message: "<script>alert(1)</script>",
  });
  assert.ok(emailBody(data).includes("<script>"));
  assert.equal(data.email, enquiry.email);
});
