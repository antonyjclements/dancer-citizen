import { createContext, useContext } from "react";
import { PrismicRichText } from "@prismicio/react";
import type { RichTextField } from "@prismicio/client";

export const RichTextEmbedsEnabled = createContext(true);

export function RichText({ field }: { field: RichTextField | null | undefined }) {
  const embedsEnabled = useContext(RichTextEmbedsEnabled);
  if (!field || field.length === 0) return null;

  return (
    <PrismicRichText
      field={field}
      components={{
        // A null result falls back to Prismic's raw HTML embed renderer.
        ...(embedsEnabled ? {} : { embed: () => <></> }),
        paragraph: ({ children }) => <p>{children}</p>,
        heading1: ({ children }) => <h1>{children}</h1>,
        heading2: ({ children }) => <h2>{children}</h2>,
        heading3: ({ children }) => <h3>{children}</h3>,
        list: ({ children }) => <ul>{children}</ul>,
        oList: ({ children }) => <ol>{children}</ol>,
        hyperlink: ({ children, node }) => {
          const data = node.data as { url?: string; target?: string };
          const isExternal = data.target === "_blank";
          return <a href={data.url} target={data.target} rel={isExternal ? "noreferrer" : undefined}>{children}</a>;
        },
      }}
    />
  );
}
