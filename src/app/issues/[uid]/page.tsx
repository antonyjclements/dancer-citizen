import { SliceZone } from "@prismicio/react";
import { IssueHeader } from "@/features/journal/components/IssueHeader";
import { IssueNavigation } from "@/features/journal/components/IssueNavigation";
import { IssueTableOfContents } from "@/features/journal/components/IssueTableOfContents";
import { getIssuePageData } from "@/features/journal/data/getIssuePageData";
import { components } from "@/slices";

type IssuePageProps = {
  params: Promise<{
    uid: string;
  }>;
};

export default async function IssuePage({ params }: IssuePageProps) {
  const { uid } = await params;
  const { issue, issueBody, tableOfContents, previousIssue, nextIssue } = await getIssuePageData(uid);

  return (
    <main>
      <IssueHeader issue={issue} />
      <section className="py-16 px-6 md:px-8">
        <div className="max-w-[800px] mx-auto">
          <SliceZone slices={issueBody} components={components} />
        </div>
      </section>
      <IssueTableOfContents entries={tableOfContents} />
      <IssueNavigation previousIssue={previousIssue} nextIssue={nextIssue} />
    </main>
  );
}
