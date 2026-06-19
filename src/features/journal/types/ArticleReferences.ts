import type { RichTextField } from "@prismicio/client";

export type ArticleReference = {
  location: string | null;
  reference_text: RichTextField;
};

export type ArticleReferenceContext = {
  references?: ArticleReference[];
};
