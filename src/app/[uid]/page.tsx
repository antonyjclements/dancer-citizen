import { SliceZone } from "@prismicio/react";
import { ContentHeader } from "@/features/journal/components/ContentHeader";
import { getContentPageData } from "@/features/journal/data/getContentPageData";
import { components } from "@/slices";

type ContentPageProps = {
  params: Promise<{
    uid: string;
  }>;
};

export default async function ContentPage({ params }: ContentPageProps) {
  const { uid } = await params;
  const { page } = await getContentPageData(uid);

  return (
    <main>
      <ContentHeader page={page} />
      <section className="py-16 px-6 md:px-8">
        <div className="max-w-[720px] mx-auto">
          <SliceZone slices={page.data.body} components={components} />
        </div>
      </section>
    </main>
  );
}
