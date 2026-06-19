import * as prismic from "@prismicio/client";

export const repositoryName = process.env.PRISMIC_REPOSITORY_NAME || "dancercitizen";

export const prismicRoutes: prismic.Route[] = [
  { type: "issue_page", path: "/issues/:uid" },
  { type: "article_page", path: "/articles/:uid" },
  { type: "content_page", path: "/:uid" },
];

export type PreviewContext = {
  ref?: string;
};

export function createPrismicClient(context: PreviewContext = {}) {
  return prismic.createClient(repositoryName, {
    routes: prismicRoutes,
    ref: context.ref,
  });
}
