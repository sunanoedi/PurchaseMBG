import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { safeLink } from "@/lib/security";
export function ArticleBody({ value }: { value: PortableTextBlock[] }) {
  return (
    <div className="prose">
      <PortableText
        value={value}
        components={{
          marks: {
            link: ({ value, children }) =>
              safeLink(value?.href) ? (
                <a href={value.href} rel="noopener noreferrer">
                  {children}
                </a>
              ) : (
                <>{children}</>
              ),
          },
          unknownType: () => null,
        }}
      />
    </div>
  );
}
