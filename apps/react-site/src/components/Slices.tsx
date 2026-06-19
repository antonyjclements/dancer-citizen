import { isFilled } from "@prismicio/client";
import type { RichTextField } from "@prismicio/client";
import { RichText } from "./RichText";
import { stripLegacyHtml } from "../text";

type LegacyLinkValue = {
  fieldsets?: Array<{
    properties?: Array<{
      alias?: string;
      value?: string;
    }>;
  }>;
};

function imageAlt(image: any, fallback: string): string {
  return stripLegacyHtml(image?.alt || fallback || "Dancer Citizen image");
}

function youtubeID(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/);
  return match?.[1] ?? null;
}

function getLegacyLinkProperty(value: LegacyLinkValue, alias: string) {
  const properties = value.fieldsets?.flatMap((fieldset) => fieldset.properties ?? []) ?? [];
  return properties.find((property) => property.alias === alias)?.value?.trim();
}

function parseContributorTitleLink(value: unknown) {
  if (typeof value !== "string") return { label: "" };

  try {
    const legacyLink = JSON.parse(value) as LegacyLinkValue;
    const label = stripLegacyHtml(getLegacyLinkProperty(legacyLink, "cta") || value);
    const href = getLegacyLinkProperty(legacyLink, "url");
    return href ? { label, href } : { label };
  } catch {
    return { label: stripLegacyHtml(value) };
  }
}

function issueLabel(issue: unknown) {
  const value = stripLegacyHtml(issue);
  return value ? `(Issue ${value})` : "";
}

function linkLegacyReadMoreText(field: RichTextField | null | undefined): RichTextField | null | undefined {
  if (!field) return field;

  return field.map((node) => {
    if (!("text" in node) || !Array.isArray(node.spans)) return node;

    const marker = "read more (";
    const markerStart = node.text.toLowerCase().indexOf(marker);
    const urlEnd = node.text.lastIndexOf(")");

    if (markerStart === -1 || urlEnd <= markerStart + marker.length) return node;

    const urlStart = markerStart + marker.length;
    const url = node.text.slice(urlStart, urlEnd).trim();
    const linkText = "read more";
    const text = `${node.text.slice(0, markerStart)}${linkText}${node.text.slice(urlEnd + 1)}`;

    return {
      ...node,
      text,
      spans: [
        ...node.spans.filter((span) => span.end <= markerStart || span.start >= urlEnd + 1),
        {
          type: "hyperlink",
          start: markerStart,
          end: markerStart + linkText.length,
          data: { link_type: "Web", url },
        },
      ],
    };
  }) as RichTextField;
}

export function Slices({ slices, references }: { slices: any[] | undefined; references?: any[] }) {
  if (!slices?.length) return null;

  return (
    <div className="slices">
      {slices.map((slice, index) => {
        const key = `${slice.id ?? slice.slice_type}-${index}`;
        if (slice.slice_type === "RichTextSection") {
          return <section key={key} className="rich-section"><RichText field={slice.primary.body as RichTextField} /></section>;
        }
        if (slice.slice_type === "Quote") {
          return <blockquote key={key}><RichText field={slice.primary.quote as RichTextField} /></blockquote>;
        }
        if (slice.slice_type === "Image" && isFilled.image(slice.primary?.image)) {
          return <figure key={key}><img src={slice.primary.image.url} alt={imageAlt(slice.primary.image, slice.primary.caption)} /><figcaption><RichText field={slice.primary.caption as RichTextField} /></figcaption></figure>;
        }
        if (slice.slice_type === "Gallery") {
          return <div key={key} className="gallery">{(slice.items ?? []).map((item: any, itemIndex: number) => isFilled.image(item.image) ? <img key={itemIndex} src={item.image.url} alt={imageAlt(item.image, item.caption)} /> : null)}</div>;
        }
        if (slice.slice_type === "VideoEmbed") {
          const url = slice.primary?.embed_url?.url || slice.primary?.embed_url || "";
          const id = youtubeID(url);
          return <figure key={key} className="video">{id ? <iframe title={stripLegacyHtml(slice.primary?.title) || "Video"} src={`https://www.youtube-nocookie.com/embed/${id}`} allowFullScreen /> : <a href={url}>Watch video</a>}<figcaption>{stripLegacyHtml(slice.primary?.title)}</figcaption></figure>;
        }
        if (slice.slice_type === "FileLink") {
          const url = slice.primary?.file?.url;
          return url ? <p key={key}><a href={url}>Open file</a></p> : null;
        }
        if (slice.slice_type === "ContributorList") {
          return (
            <section key={key} className="contributor-list">
              {slice.primary?.heading ? <h2>{stripLegacyHtml(slice.primary.heading)}</h2> : null}
              {(slice.items ?? []).map((item: any, itemIndex: number) => {
                const titleLink = parseContributorTitleLink(item.title_link || item.name || item.title || item.contributor_name);
                const label = issueLabel(item.issue);
                const articleId = titleLink.href?.startsWith("#") ? titleLink.href.slice(1) : undefined;

                return (
                  <article id={articleId} key={itemIndex}>
                    {isFilled.image(item.thumbnail) ? <img src={item.thumbnail.url} alt={imageAlt(item.thumbnail, titleLink.label)} /> : null}
                    <h3>
                      {titleLink.href ? <a href={titleLink.href}>{titleLink.label}</a> : titleLink.label}
                      {label ? <span className="issue-label"> {label}</span> : null}
                    </h3>
                    <RichText field={linkLegacyReadMoreText(item.body_text || item.bio) as RichTextField} />
                  </article>
                );
              })}
            </section>
          );
        }
        return <section key={key} className="pending">Pending slice import: {slice.slice_type}</section>;
      })}
      {references?.length ? null : null}
    </div>
  );
}
