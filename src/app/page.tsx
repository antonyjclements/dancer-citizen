import { HomeHero } from "@/features/journal/components/HomeHero";
import { IssueArchiveGrid } from "@/features/journal/components/IssueArchiveGrid";
import { LatestIssuePanel } from "@/features/journal/components/LatestIssuePanel";
import { MemorialPanel } from "@/features/journal/components/MemorialPanel";
import { NewsletterPanel } from "@/features/journal/components/NewsletterPanel";
import { getHomePageData } from "@/features/journal/data/getHomePageData";

export default async function Home() {
  const { issues, latestIssue } = await getHomePageData();
  const archiveIssues = latestIssue ? issues.filter((issue) => issue.id !== latestIssue.id) : issues;

  return (
    <main>
      <HomeHero />
      <LatestIssuePanel issue={latestIssue} />
      <MemorialPanel />
      <IssueArchiveGrid issues={archiveIssues} />
      <NewsletterPanel />
    </main>
  );
}
