import type { Content } from "@prismicio/client";
import { createClient } from "@/foundation/prismic/prismicClient";

type IssueDocument = Omit<Content.IssuePageDocument, "uid" | "tags"> & { uid: string; tags: string[] };

export type HomePageData = {
  issues: IssueDocument[];
  latestIssue: IssueDocument | null;
};

export async function getHomePageData(): Promise<HomePageData> {
  const client = createClient();
  const issues = await client.getAllByType("issue_page", {
    orderings: [{ field: "my.issue_page.issue_number", direction: "desc" }],
  }) as unknown as IssueDocument[];

  return {
    issues,
    latestIssue: issues[0] ?? null,
  };
}
