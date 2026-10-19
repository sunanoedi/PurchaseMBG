"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dictionary, Locale, PageKey } from "@/lib/content";
import { href } from "@/lib/content";
export function Header({
  t,
  locale,
  languages,
}: {
  t: Dictionary;
  locale: Locale;
  languages: { id: string; en: string };
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  const main: PageKey[] = ["home", "services", "menus"];
  const other: PageKey[] = [
    "about",
    "kitchen",
    "certificates",
    "clients",
    "gallery",
    "articles",
  ];
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href={href(locale, "home")}
          className="brand"
          title={t.brand.name}
        >
          <span className="wordmark">
            {t.brand.short.split(" ")[0]}
            <small>{t.brand.short.split(" ")[1]}</small>
          </span>
          <span className="brand-name">{t.brand.name}</span>
        </Link>
        <nav className="desktop-nav" aria-label={t.ui.quickLinks}>
          {main.map((key) => (
            <Link key={key} href={href(locale, key)}>
              {t.nav[key]}
            </Link>
          ))}
          <details>
            <summary>{t.nav.about}</summary>
            <div className="nav-dropdown">
              {other.map((key) => (
                <Link key={key} href={href(locale, key)}>
                  {t.nav[key]}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className="header-actions">
          <div className="languages">
            <Link
              href={languages.id}
              lang="id"
              aria-label={t.ui.languageId}
              aria-current={locale === "id" ? "page" : undefined}
            >
              {t.ui.languageId.split(" — ")[0]}
            </Link>
            <Link
              href={languages.en}
              lang="en"
              aria-label={t.ui.languageEn}
              aria-current={locale === "en" ? "page" : undefined}
            >
              {t.ui.languageEn.split(" — ")[0]}
            </Link>
          </div>
          <Link href={href(locale, "contact")} className="button header-quote">
            {t.ui.quote}
            <span aria-hidden="true">→</span>
          </Link>
          <button
            ref={button}
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t.ui.menuClose : t.ui.menuOpen}
            onClick={() => setOpen(!open)}
          >
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      <nav
        id="mobile-nav"
        className="mobile-nav"
        hidden={!open}
        aria-label={t.ui.quickLinks}
      >
        {[...main, ...other, "contact" as PageKey].map((key) => (
          <Link
            key={key}
            href={href(locale, key)}
            onClick={() => setOpen(false)}
          >
            {t.nav[key]}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
