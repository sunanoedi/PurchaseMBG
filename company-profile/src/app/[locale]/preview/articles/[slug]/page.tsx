import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { editorAllowed } from "@/lib/access";
import { getRecords } from "@/lib/cms";
import { dictionary, type Locale } from "@/lib/content";
import { CmsPhoto } from "@/components/photo";
import { ArticleBody } from "@/components/article-body";
export const metadata = { robots: { index: false, follow: false } };
export default async function Preview({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (
    !["id", "en"].includes(raw) ||
    !(await draftMode()).isEnabled ||
    !(await editorAllowed())
  )
    notFound();
  const locale = raw as Locale,
    t = dictionary(locale),
    records = await getRecords(true),
    article = records
      .filter((r) => r._type === "article")
      .find((r) => r.slug[locale].current === slug);
  if (!article) notFound();
  return (
    <main id="main">
      <p className="preview-banner">{t.ui.draft}</p>
      <article className="section article">
        <h1>{article.name[locale]}</h1>
        <p className="lead">{article.description[locale]}</p>
        <CmsPhoto locale={locale} image={article.photo} preview />
        <ArticleBody value={article.body[locale]} />
      </article>
    </main>
  );
}
