import type { ImageFieldImage } from "@prismicio/client";

export function getImageFieldWithAlt<TImage extends ImageFieldImage>(
  image: TImage,
  fallbackAlt: string,
): TImage {
  const alt = image.alt?.trim() || fallbackAlt.trim();

  return {
    ...image,
    alt: alt || "Editorial image",
  };
}
