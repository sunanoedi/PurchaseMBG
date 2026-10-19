import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { dictionary, href, pageKey, type Locale } from "@/lib/content";
import { getRecords } from "@/lib/cms";
import { Header } from "@/components/header";
import { Footer, settings } from "@/components/site";
import { jsonLd } from "@/lib/security";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (raw !== "id" && raw !== "en") notFound();
  const locale = raw as Locale,
    t = dictionary(locale),
    records = await getRecords(),
    h = await headers();
  const segments = (h.get("x-request-path") ?? `/${locale}`)
      .split("/")
      .filter(Boolean)
      .slice(1),
    key = pageKey(locale, segments) ?? "home";
  const article =
    key === "articles" && segments[1]
      ? records
          .filter((r) => r._type === "article")
          .find((r) => r.slug[locale].current === segments[1])
      : undefined;
  const languages = {
      id: href("id", key, article ? article.slug.id.current : undefined),
      en: href("en", key, article ? article.slug.en.current : undefined),
    },
    s = settings(t, locale, records);
  const business = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: t.brand.name,
    url: "https://ubg.id",
    telephone: s.phone,
    email: s.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: "Cikarang Barat",
      addressRegion: "Jawa Barat",
      addressCountry: "ID",
    },
  };
  return (
    <NextIntlClientProvider locale={locale} messages={{}}>
      <a className="skip-link" href="#main">
        {t.ui.skip}
      </a>
      <Header t={t} locale={locale} languages={languages} />
      {children}
      <Footer locale={locale} records={records} />
      <script type="application/ld+json" nonce={h.get("x-nonce") ?? undefined}>
        {jsonLd(business)}
      </script>
    </NextIntlClientProvider>
  );
}
