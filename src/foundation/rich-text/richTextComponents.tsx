import Link from "next/link";
import type { JSXMapSerializer } from "@prismicio/react";

export const articleRichTextComponents: JSXMapSerializer = {
  paragraph: ({ children }) => (
    <p className="font-display text-[19px] leading-[1.85] text-[#333] mb-7 break-words [overflow-wrap:anywhere]">{children}</p>
  ),
  heading1: ({ children }) => (
    <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">{children}</h2>
  ),
  heading2: ({ children }) => (
    <h2 className="font-display text-[28px] font-medium leading-[1.25] text-ink mt-12 mb-5">{children}</h2>
  ),
  heading3: ({ children }) => (
    <h3 className="font-display text-[23px] font-medium leading-[1.25] text-ink mt-10 mb-4">{children}</h3>
  ),
  listItem: ({ children }) => (
    <li className="font-display text-[19px] leading-[1.85] text-[#333] mb-7 ml-6 break-words [overflow-wrap:anywhere]">{children}</li>
  ),
  oListItem: ({ children }) => (
    <li className="font-display text-[19px] leading-[1.85] text-[#333] mb-7 ml-6 break-words [overflow-wrap:anywhere]">{children}</li>
  ),
  hyperlink: ({ node, children }) => {
    const target = "target" in node.data && typeof node.data.target === "string" ? node.data.target : undefined;
    const url = "url" in node.data && typeof node.data.url === "string" ? node.data.url : undefined;

    if (!url) {
      return <>{children}</>;
    }

    if (url.startsWith("#reference-")) {
      const referenceNumber = url.replace("#reference-", "");

      return (
        <a
          id={`reverse-anchor-${referenceNumber}`}
          href={url}
          className="reference relative -top-2 mx-0.5 text-[0.78em] font-semibold text-ink"
        >
          <sup>{children}</sup>
        </a>
      );
    }

    if (url.includes("paypal.com/cgi-bin/webscr") && url.includes("hosted_button_id=")) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center border border-ink bg-transparent px-5 py-2.5 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-ink hover:text-[#fcfaf5]"
        >
          {children}
        </a>
      );
    }

    if (target === "_blank") {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="border-b border-current pb-0.5 break-words [overflow-wrap:anywhere]"
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={url} className="border-b border-current pb-0.5 break-words [overflow-wrap:anywhere]">
        {children}
      </Link>
    );
  },
};
