import type { Route } from "@prismicio/client";

export const prismicRoutes: Route[] = [
  {
    type: "issue_page",
    path: "/issues/:uid",
  },
  {
    type: "article_page",
    path: "/articles/:uid",
  },
  {
    type: "content_page",
    path: "/:uid",
  },
];
