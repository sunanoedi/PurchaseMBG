import { images, type ImageKey } from "../../content/images";
import { dictionary, type Locale } from "@/lib/content";
import type { CmsImage } from "@/lib/cms-model";
import { mediaUrl } from "@/lib/media";
export function Photo({
  name,
  locale,
  className = "",
  eager = false,
}: {
  name: ImageKey;
  locale: Locale;
  className?: string;
  eager?: boolean;
}) {
  const t = dictionary(locale),
    image = images[name];
  return (
    <figure className={`photo ${className}`}>
      <img
        src={image.src}
        alt={t.images[image.altKey]}
        width={800}
        height={650}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
      />
      {image.placeholder && <figcaption>{t.ui.placeholder}</figcaption>}
    </figure>
  );
}
export function CmsPhoto({
  image,
  locale,
  preview = false,
}: {
  image: CmsImage;
  locale: Locale;
  preview?: boolean;
}) {
  const src = mediaUrl(image.asset._id, preview);
  return src ? (
    <figure className="photo">
      <img
        src={src}
        alt={image.alt[locale]}
        width={image.asset.metadata.dimensions.width}
        height={image.asset.metadata.dimensions.height}
        loading="lazy"
      />
    </figure>
  ) : null;
}
