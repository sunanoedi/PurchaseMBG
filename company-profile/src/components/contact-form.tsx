"use client";
import Script from "next/script";
import { useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/content";
import { href } from "@/lib/content";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (id?: string) => void;
    };
  }
}
export function ContactForm({
  t,
  locale,
  nonce,
  siteKey,
  enabled,
}: {
  t: Dictionary;
  locale: Locale;
  nonce: string;
  siteKey: string;
  enabled: boolean;
}) {
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const captcha = useRef<HTMLDivElement>(null),
    widget = useRef<string | undefined>(undefined);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy || !token) return;
    setBusy(true);
    const form = event.currentTarget,
      fields = new FormData(form);
    try {
      const payload = {
        name: fields.get("name"),
        company: fields.get("company"),
        email: fields.get("email"),
        phone: fields.get("phone"),
        service: fields.get("service"),
        portions: Number(fields.get("portions")),
        message: fields.get("message"),
        consent: fields.get("consent") === "on",
        website: fields.get("website"),
        token,
      };
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      setStatus(
        response.ok
          ? t.form.success
          : response.status === 429
            ? t.form.rate
            : result.code === "validation"
              ? t.form.validation
              : t.form.error,
      );
      if (response.ok) form.reset();
    } catch {
      setStatus(t.form.error);
    } finally {
      setBusy(false);
      setToken("");
      window.turnstile?.reset(widget.current);
    }
  }
  return (
    <form className="quote-form" onSubmit={submit}>
      <p className="muted">{enabled ? t.form.required : t.form.disabled}</p>
      <fieldset disabled={!enabled || busy}>
        <div className="form-grid">
          <label>
            {t.form.name}
            <input name="name" autoComplete="name" required maxLength={100} />
          </label>
          <label>
            {t.form.company}
            <input name="company" autoComplete="organization" maxLength={150} />
          </label>
          <label>
            {t.form.email}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            {t.form.phone}
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={30}
            />
          </label>
          <label>
            {t.form.service}
            <select name="service" required>
              <option value="industry">{t.services[0].title}</option>
              <option value="event">{t.services[1].title}</option>
            </select>
          </label>
          <label>
            {t.form.portions}
            <input
              name="portions"
              type="number"
              min={1}
              max={100000}
              required
            />
          </label>
        </div>
        <label>
          {t.form.message}
          <textarea name="message" rows={5} required maxLength={3000} />
        </label>
        <div className="honeypot" aria-hidden="true">
          <label>
            {t.form.bot}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              maxLength={200}
            />
          </label>
        </div>
        <label className="consent">
          <input name="consent" type="checkbox" required />
          <span>
            {t.form.consent}{" "}
            <a href={href(locale, "privacy")}>{t.nav.privacy}</a>
          </span>
        </label>
        {enabled && (
          <>
            <div ref={captcha} />
            <p className="muted">{t.form.captcha}</p>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              nonce={nonce}
              onReady={() => {
                if (
                  captcha.current &&
                  window.turnstile &&
                  widget.current === undefined
                )
                  widget.current = window.turnstile.render(captcha.current, {
                    sitekey: siteKey,
                    action: "quote",
                    language: locale,
                    callback: (value: string) => setToken(value),
                    "expired-callback": () => setToken(""),
                    "error-callback": () => setToken(""),
                  });
              }}
            />
          </>
        )}
        <button
          className="button"
          type="submit"
          disabled={!enabled || busy || !token}
        >
          {busy ? t.form.sending : t.form.send}
          <span aria-hidden="true">→</span>
        </button>
      </fieldset>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
export function MapEmbed({ url, t }: { url: string; t: Dictionary }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="map-panel">
      <p>{t.ui.mapNotice}</p>
      {loaded ? (
        <iframe
          title={t.ui.mapTitle}
          src={url}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <button
          type="button"
          className="button secondary"
          onClick={() => setLoaded(true)}
        >
          {t.ui.map}
        </button>
      )}
    </div>
  );
}
