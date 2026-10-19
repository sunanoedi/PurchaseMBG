import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  dictionary,
  href,
  pageKey,
  type Locale,
  type PageKey,
} from "@/lib/content";
import { getCmsData } from "@/lib/cms";
import { mediaUrl } from "@/lib/media";
import { quoteConfig } from "@/lib/quote";
import { Photo, CmsPhoto } from "@/components/photo";
import { CallToAction, settings } from "@/components/site";
import { Gallery, type GalleryPhoto } from "@/components/gallery";
import { ContactForm, MapEmbed } from "@/components/contact-form";
import { CertificateList } from "@/components/certificate-list";
import { ArticleBody } from "@/components/article-body";
import { jsonLd } from "@/lib/security";
import { images } from "../../../../content/images";
import type { CmsArticle } from "@/lib/cms-model";
type Props = { params: Promise<{ locale: string; path?: string[] }> };
async function context(props: Props) {
  const p = await props.params;
  if (p.locale !== "id" && p.locale !== "en") notFound();
  const locale = p.locale as Locale,
    path = p.path ?? [],
    key = pageKey(locale, path);
  if (!key || path.length > 2 || (path.length > 1 && key !== "articles"))
    notFound();
  const t = dictionary(locale),
    data = await getCmsData(),
    records = data.records;
  const article =
    key === "articles" && path[1]
      ? (records.find(
          (r) => r._type === "article" && r.slug[locale].current === path[1],
        ) as CmsArticle | undefined)
      : undefined;
  if (path[1] && !article) notFound();
  return { locale, t, key, records, article, fallback: data.fallback };
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, t, key, article } = await context(props),
    title = article?.name[locale] ?? (key === "home" ? t.seo.home : t.nav[key]),
    description =
      article?.seo?.[locale] ??
      article?.description[locale] ??
      (key === "home"
        ? t.seo.description
        : (t.pages[key as Exclude<PageKey, "home">]?.intro ??
          t.seo.description)),
    canonical = href(locale, key, article?.slug[locale].current);
  return {
    title: `${title} | ${t.brand.short}`,
    description,
    alternates: {
      canonical,
      languages: {
        id: href("id", key, article?.slug.id.current),
        en: href("en", key, article?.slug.en.current),
        "x-default": href("id", key, article?.slug.id.current),
      },
    },
    openGraph: {
      title,
      description,
      url: `https://ubg.id${canonical}`,
      siteName: t.brand.name,
      locale: locale === "id" ? "id_ID" : "en_GB",
      alternateLocale: locale === "id" ? "en_GB" : "id_ID",
      type: article ? "article" : "website",
      images: [{ url: "/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og"],
    },
  };
}
export default async function Page(props: Props) {
  const { locale, t, key, records, article, fallback } = await context(props);
  const nonce = (await headers()).get("x-nonce") ?? "";
  if (article)
    return (
      <main id="main">
        <article className="section article">
          <p className="eyebrow">{t.nav.articles}</p>
          <h1>{article.name[locale]}</h1>
          <p className="lead">{article.description[locale]}</p>
          <time dateTime={article.publishedAt}>
            {new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
              dateStyle: "long",
              timeZone: "Asia/Jakarta",
            }).format(new Date(article.publishedAt))}
          </time>
          <CmsPhoto image={article.photo} locale={locale} />
          <ArticleBody value={article.body[locale]} />
          <script type="application/ld+json" nonce={nonce}>
            {jsonLd({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: article.name[locale],
              description: article.description[locale],
              datePublished: article.publishedAt,
              inLanguage: locale,
              mainEntityOfPage: `https://ubg.id${href(locale, "articles", article.slug[locale].current)}`,
              author: { "@type": "Organization", name: t.brand.name },
              publisher: { "@type": "Organization", name: t.brand.name },
            })}
          </script>
        </article>
        <CallToAction locale={locale} />
      </main>
    );
  if (key === "home")
    return (
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow dot">{t.brand.tagline}</p>
            <h1>
              {t.hero.title.map((line, i) => (
                <span key={line} className={i === 1 ? "red underline" : ""}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="lead">{t.hero.body}</p>
            <div className="button-row">
              <Link href={href(locale, "contact")} className="button">
                {t.ui.quote}
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href={href(locale, "services")}
                className="button secondary"
              >
                {t.ui.learn}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="location">{t.ui.region}</p>
          </div>
          <div className="hero-art">
            <span className="paper-label">{t.ui.illustrationTitle}</span>
            <Photo name="meal" locale={locale} eager />
            <div className="sticker">
              <strong>{t.ui.sticker}</strong>
              <span>{t.ui.stickerBody}</span>
            </div>
          </div>
        </section>
        <section className="advantages" aria-label={t.brand.tagline}>
          {t.advantages.map((item) => (
            <div key={item.number}>
              <strong>{item.number}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>
        <p className="verification-note">{t.ui.verifiedNote}</p>
        <section className="section">
          <p className="eyebrow">{t.home.servicesEyebrow}</p>
          <h2>{t.home.servicesTitle}</h2>
          <div className="service-pair">
            {t.services.map((service, i) => (
              <article key={service.category}>
                <Photo name={i === 0 ? "kitchen" : "event"} locale={locale} />
                <span className="section-number">0{i + 1}</span>
                <h3>{service.title}</h3>
                <p>{service.body}</p>
                <Link className="text-link" href={href(locale, "services")}>
                  {t.ui.learn} →
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="split-section">
          <div>
            <p className="eyebrow">{t.nav.certificates}</p>
            <h2>{t.home.certTitle}</h2>
            <p>{t.home.certBody}</p>
            <Link href={href(locale, "certificates")} className="text-link">
              {t.nav.certificates} →
            </Link>
          </div>
          <div className="client-teaser">
            <p className="eyebrow">{t.nav.clients}</p>
            <h2>{t.home.clientsTitle}</h2>
            <p>{t.home.clientsBody}</p>
            <Link href={href(locale, "clients")} className="text-link">
              {t.nav.clients} →
            </Link>
          </div>
        </section>
        <CallToAction locale={locale} />
      </main>
    );
  const page = t.pages[key];
  let body: React.ReactNode = null;
  switch (key) {
    case "about":
      body = (
        <>
          <section className="director split-section">
            <Photo name="director" locale={locale} />
            <div>
              <p className="eyebrow">{t.ui.directorRole}</p>
              <h2>{t.pages.about.directorTitle}</h2>
              <blockquote>{t.pages.about.directorMessage}</blockquote>
              <p className="signature">{t.pages.about.directorName}</p>
              <p>{t.ui.directorRole}</p>
            </div>
          </section>
          <section className="section vision-grid">
            <div>
              <p className="eyebrow">01</p>
              <h2>{t.pages.about.visionTitle}</h2>
              <p>{t.pages.about.vision}</p>
            </div>
            <div>
              <p className="eyebrow">02</p>
              <h2>{t.pages.about.missionTitle}</h2>
              <ul>
                {t.pages.about.missions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </section>
          <section className="section values">
            <h2>{t.pages.about.valuesTitle}</h2>
            {t.pages.about.values.map((v, i) => (
              <article key={v.title}>
                <strong>0{i + 1}</strong>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </article>
            ))}
          </section>
        </>
      );
      break;
    case "services":
      body = (
        <section className="section service-stories">
          {t.services.map((s, i) => (
            <article key={s.category}>
              <Photo locale={locale} name={i === 0 ? "kitchen" : "event"} />
              <div>
                <span className="section-number">0{i + 1}</span>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
                <ul>
                  {s.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                <Link className="button" href={href(locale, "contact")}>
                  {t.ui.quote} →
                </Link>
              </div>
            </article>
          ))}
        </section>
      );
      break;
    case "menus": {
      const packages = records.filter((r) => r._type === "menuPackage");
      const items = packages.length
        ? packages.map((r) => ({
            name: r.name[locale],
            category: r.category,
            description: r.description[locale],
            items: r.items[locale],
            image: (
              <>{r.photo && <CmsPhoto image={r.photo} locale={locale} />}</>
            ),
          }))
        : t.packages.map((r) => ({ ...r, image: null }));
      const hasCms = !fallback;
      body = (
        <section className="section menu-packages">
          {(packages.length || !hasCms ? items : []).map((p, i) => (
            <article key={p.name}>
              <div>
                <p className="eyebrow">
                  {p.category === "industry"
                    ? t.ui.serviceIndustry
                    : t.ui.serviceEvent}
                </p>
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <ul>
                  {p.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <Link href={href(locale, "contact")} className="button">
                  {t.ui.quote} →
                </Link>
              </div>
              {p.image}
              <span className="package-number" aria-hidden="true">
                0{i + 1}
              </span>
            </article>
          ))}
          {hasCms && !packages.length && (
            <p className="empty-state">{t.ui.empty}</p>
          )}
        </section>
      );
      break;
    }
    case "gallery": {
      const cms = records.filter((r) => r._type === "galleryItem");
      const fallbackImages: GalleryPhoto[] = (
        [
          ["kitchen", "dapur"],
          ["team", "tim"],
          ["meal", "hidangan"],
          ["event", "acara"],
        ] as const
      ).map(([image, category]) => ({
        src: images[image].src,
        alt: t.images[image],
        category,
        placeholder: true,
      }));
      const items: GalleryPhoto[] = cms.flatMap((r) => {
        const src = mediaUrl(r.photo.asset._id);
        return src
          ? [
              {
                src,
                alt: r.photo.alt[locale],
                category: r.category,
                placeholder: false,
              },
            ]
          : [];
      });
      body = (
        <section className="section">
          <Gallery
            t={t}
            items={cms.length ? items : !fallback ? [] : fallbackImages}
          />
        </section>
      );
      break;
    }
    case "certificates":
      body = (
        <section className="section">
          <CertificateList
            t={t}
            locale={locale}
            items={records
              .filter((r) => r._type === "certificate")
              .map((r) => ({
                id: r._id,
                name: r.name[locale],
                issuer: r.issuer[locale],
                number: r.number,
                expires: r.expires,
                image: mediaUrl(r.photo.asset._id) ?? undefined,
                alt: r.photo.alt[locale],
              }))}
          />
          <div className="legal-summary">
            <h2>{t.pages.certificates.legalTitle}</h2>
            <ul>
              {t.pages.certificates.legal.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </section>
      );
      break;
    case "clients": {
      const clients = records.filter((r) => r._type === "client");
      body = (
        <section className="section client-regions">
          {[...new Set(clients.map((r) => r.region[locale]))].map((region) => (
            <section key={region}>
              <h2>{region}</h2>
              <div>
                {clients
                  .filter((r) => r.region[locale] === region)
                  .map((r) => (
                    <article key={r._id}>
                      {r.photo && <CmsPhoto image={r.photo} locale={locale} />}
                      <h3>{r.name[locale]}</h3>
                    </article>
                  ))}
              </div>
            </section>
          ))}
          {!clients.length && <p className="empty-state">{t.ui.empty}</p>}
        </section>
      );
      break;
    }
    case "kitchen":
      body = (
        <section className="section kitchen-details">
          <Photo name="kitchen" locale={locale} />
          {t.pages.kitchen.items.map((item, i) => (
            <article key={item.title}>
              <span className="section-number">0{i + 1}</span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </section>
      );
      break;
    case "contact": {
      const config = quoteConfig(),
        s = settings(t, locale, records);
      body = (
        <section className="section contact-grid">
          <ContactForm
            t={t}
            locale={locale}
            nonce={nonce}
            enabled={Boolean(config)}
            contact={{ whatsapp: s.whatsapp, email: s.email }}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          />
          <aside>
            <h2>{t.brand.name}</h2>
            <address>{s.address}</address>
            <a href={`mailto:${s.email}`}>{s.email}</a>
            <a href={`tel:${s.phone.replace(/[^+0-9]/g, "")}`}>{s.phone}</a>
            <a
              className="button secondary"
              href={`https://wa.me/${s.whatsapp}`}
            >
              {t.ui.whatsapp} ↗
            </a>
            <MapEmbed
              t={t}
              url={
                s.mapUrl ??
                `https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed`
              }
            />
          </aside>
        </section>
      );
      break;
    }
    case "privacy":
      body = (
        <section className="section prose">
          {t.pages.privacy.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </section>
      );
      break;
    case "articles": {
      const articles = records.filter((r) => r._type === "article");
      body = (
        <section className="section article-list">
          {articles.map((a) => (
            <article key={a._id}>
              <Link href={href(locale, "articles", a.slug[locale].current)}>
                <CmsPhoto image={a.photo} locale={locale} />
                <h2>{a.name[locale]}</h2>
                <p>{a.description[locale]}</p>
                <span className="text-link">{t.ui.read} →</span>
              </Link>
            </article>
          ))}
          {!articles.length && <p className="empty-state">{t.ui.empty}</p>}
        </section>
      );
      break;
    }
  }
  return (
    <main id="main">
      <section className="page-intro">
        <p className="eyebrow dot">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p className="lead">{page.intro}</p>
      </section>
      {body}
      {!["privacy", "contact"].includes(key) && (
        <CallToAction locale={locale} />
      )}
    </main>
  );
}
