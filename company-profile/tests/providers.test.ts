import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { verifyEditorToken } from "../src/lib/access-core.ts";
import {
  quoteConfig,
  rateLimit,
  verifyCaptcha,
  sendEnquiry,
  trustedIp,
} from "../src/lib/quote.ts";
import { quoteSchema } from "../src/lib/quote-core.ts";
const config = {
  siteKey: "synthetic",
  captcha: "synthetic",
  resend: "synthetic",
  from: "sender@example.com",
  to: "recipient@example.com",
  redis: "https://synthetic.upstash.io",
  redisToken: "synthetic",
  salt: "a".repeat(64),
};
test("provider configuration is enabled only when every value is valid", () => {
  const env = {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "synthetic",
    TURNSTILE_SECRET_KEY: "synthetic",
    RESEND_API_KEY: "synthetic",
    RESEND_FROM_EMAIL: config.from,
    CONTACT_TO_EMAIL: config.to,
    UPSTASH_REDIS_REST_URL: config.redis,
    UPSTASH_REDIS_REST_TOKEN: "synthetic",
    RATE_LIMIT_SALT: config.salt,
  };
  assert.ok(quoteConfig(env));
  assert.equal(
    quoteConfig({ ...env, UPSTASH_REDIS_REST_URL: "not a URL" }),
    null,
  );
  assert.equal(quoteConfig({ ...env, RATE_LIMIT_SALT: "short" }), null);
});
test("Redis uses atomic expiry and hashed keys without raw IP", async () => {
  const original = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(url, config.redis);
    const body = JSON.parse(String(init?.body));
    assert.equal(body[0], "EVAL");
    assert.match(body[1], /INCR/);
    assert.match(body[1], /EXPIRE/);
    assert.match(body[1], /900/);
    assert.ok(!body[3].includes("192.0.2.1"));
    return Response.json({ result: 6 });
  };
  try {
    assert.equal(await rateLimit(config, "192.0.2.1"), false);
  } finally {
    global.fetch = original;
  }
});
test("Redis errors and invalid responses never fail open", async () => {
  const original = global.fetch;
  try {
    for (const response of [
      Response.json({ result: "bad" }),
      Response.json({ error: "synthetic" }, { status: 500 }),
    ]) {
      global.fetch = async () => response;
      await assert.rejects(() => rateLimit(config, "192.0.2.1"));
    }
  } finally {
    global.fetch = original;
  }
});
test("Turnstile requires approved hostname, action and recent successful challenge", async () => {
  const original = global.fetch;
  const good = {
    success: true,
    hostname: "ubg.id",
    action: "quote",
    challenge_ts: new Date().toISOString(),
  };
  try {
    for (const [data, expected] of [
      [good, true],
      [{ ...good, success: false }, false],
      [{ ...good, hostname: "untrusted.example" }, false],
      [{ ...good, action: "other" }, false],
      [{ ...good, challenge_ts: "bad" }, false],
      [
        { ...good, challenge_ts: new Date(Date.now() - 600000).toISOString() },
        false,
      ],
    ] as const) {
      global.fetch = async (url, init) => {
        assert.equal(
          url,
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        );
        assert.ok(!String(init?.body).includes("remoteip"));
        return Response.json(data);
      };
      assert.equal(await verifyCaptcha(config, "synthetic"), expected);
    }
  } finally {
    global.fetch = original;
  }
});
test("Resend receives plaintext with server-configured recipient and validated reply-to", async () => {
  const original = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.to, [config.to]);
    assert.equal(body.html, undefined);
    assert.equal(body.reply_to, "test@example.com");
    return Response.json({ id: "synthetic-message" });
  };
  try {
    await sendEnquiry(
      config,
      quoteSchema.parse({
        name: "Test",
        company: "",
        email: "test@example.com",
        phone: "0811665925",
        service: "event",
        portions: 50,
        message: "Synthetic only",
        consent: true,
        website: "",
        token: "synthetic",
      }),
    );
  } finally {
    global.fetch = original;
  }
});
test("trusted IP resolver validates official Vercel header and ignores caller forwarding chains", () => {
  const old = process.env.VERCEL;
  process.env.VERCEL = "1";
  try {
    assert.equal(
      trustedIp(
        new Request("https://ubg.id", {
          headers: {
            "x-real-ip": "192.0.2.1",
            "x-forwarded-for": "203.0.113.9",
          },
        }),
      ),
      "192.0.2.1",
    );
    assert.equal(
      trustedIp(
        new Request("https://ubg.id", {
          headers: { "x-real-ip": "bad", "x-forwarded-for": "203.0.113.9" },
        }),
      ),
      null,
    );
  } finally {
    if (old === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = old;
  }
});
test("editor JWT requires signature, issuer, audience, expiry and active email allowlist", async () => {
  const pair = await generateKeyPair("RS256"),
    jwk = await exportJWK(pair.publicKey),
    key = createLocalJWKSet({
      keys: [{ ...jwk, kid: "synthetic", alg: "RS256" }],
    }),
    issuer = "https://synthetic.cloudflareaccess.com",
    config = {
      issuer,
      audience: "synthetic-audience",
      emails: ["editor@example.com"],
    };
  const sign = async (
    payload: Record<string, unknown> = {},
    iss = issuer,
    aud = config.audience,
    expiry = "1h",
  ) =>
    new SignJWT({ email: "editor@example.com", ...payload })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic" })
      .setIssuedAt()
      .setExpirationTime(expiry)
      .setIssuer(iss)
      .setAudience(aud)
      .sign(pair.privateKey);
  assert.equal(await verifyEditorToken(await sign(), key, config), true);
  assert.equal(
    await verifyEditorToken(
      await sign({ email: "removed@example.com" }),
      key,
      config,
    ),
    false,
  );
  assert.equal(
    await verifyEditorToken(
      await sign({}, "https://wrong.example"),
      key,
      config,
    ),
    false,
  );
  assert.equal(
    await verifyEditorToken(await sign({}, issuer, "wrong"), key, config),
    false,
  );
  assert.equal(
    await verifyEditorToken(
      await sign({}, issuer, config.audience, "-1h"),
      key,
      config,
    ),
    false,
  );
  assert.equal(await verifyEditorToken("forged", key, config), false);
});
