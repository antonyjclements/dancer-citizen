import { asText, isFilled, type RichTextField } from "@prismicio/client";
import { useRef, useState } from "react";
import type { GallerySlice } from "../../../../prismicio-types";
import { stripLegacyHtml } from "../text";

function galleryText(field: RichTextField | string | null | undefined) {
  return stripLegacyHtml(typeof field === "string" ? field : asText(field));
}

export function Gallery({ slice }: { slice: GallerySlice }) {
  const viewer = useRef<HTMLDialogElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const heading = stripLegacyHtml(slice.primary?.heading);
  const images = (slice.items ?? []).flatMap(({ image, caption, credit }) => {
    if (!isFilled.image(image)) return [];

    const captionText = galleryText(caption);
    return [{
      url: image.url,
      alt: stripLegacyHtml(image.alt) || captionText,
      caption: captionText,
      credit: galleryText(credit),
    }];
  });
  const selected = selectedIndex === null ? undefined : images[selectedIndex];
  const hasMultipleImages = images.length > 1;

  function moveImage(offset: number) {
    setSelectedIndex((index) => index === null ? null : (index + offset + images.length) % images.length);
    viewer.current?.scrollTo(0, 0);
  }

  return (
    <div className="gallery">
      {images.length > 0 && heading && <h2>{heading}</h2>}
      {images.map(({ url, alt }, index) => (
        <button
          key={index}
          type="button"
          className="gallery-thumbnail"
          aria-haspopup="dialog"
          aria-label={alt ? `Enlarge image ${index + 1}: ${alt}` : `Enlarge image ${index + 1}`}
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            setSelectedIndex(index);
            viewer.current?.showModal();
            viewer.current?.scrollTo(0, 0);
          }}
        >
          <img src={url} alt={alt} loading="lazy" />
          <span className="gallery-expand" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4" />
            </svg>
          </span>
        </button>
      ))}
      {images.length > 0 && (
        <dialog
          className="gallery-viewer"
          ref={viewer}
          aria-label={heading || "Image gallery"}
          onClose={(event) => {
            if (!event.currentTarget.open) setSelectedIndex(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onKeyDown={(event) => {
            if (!hasMultipleImages || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
            event.preventDefault();
            moveImage(event.key === "ArrowLeft" ? -1 : 1);
          }}
        >
          <div className="gallery-viewer-bar">
            <button type="button" onClick={() => viewer.current?.close()}>Close</button>
            <span role="status">{selectedIndex !== null && `Image ${selectedIndex + 1} of ${images.length}`}</span>
            {hasMultipleImages && (
              <div className="gallery-viewer-nav">
                <button type="button" aria-label="Previous image" onClick={() => moveImage(-1)}>‹</button>
                <button type="button" aria-label="Next image" onClick={() => moveImage(1)}>›</button>
              </div>
            )}
          </div>
          {selected && (
            <figure>
              <img src={selected.url} alt={selected.alt || "Gallery image"} />
              {(selected.caption || selected.credit) && (
                <figcaption>
                  {selected.caption && <div>{selected.caption}</div>}
                  {selected.credit && <small>{selected.credit}</small>}
                </figcaption>
              )}
            </figure>
          )}
        </dialog>
      )}
    </div>
  );
}
