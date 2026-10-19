import { headers } from "next/headers";
import Link from "next/link";
import { dictionary, href } from "@/lib/content";
export default async function NotFound() {
  const locale = (await headers()).get("x-locale") === "en" ? "en" : "id",
    t = dictionary(locale);
  return (
    <main id="main" className="section not-found">
      <p className="eyebrow">404</p>
      <h1>{t.ui.notFoundTitle}</h1>
      <p>{t.ui.notFoundBody}</p>
      <Link href={href(locale, "home")} className="button">
        {t.ui.back}
      </Link>
    </main>
  );
}
