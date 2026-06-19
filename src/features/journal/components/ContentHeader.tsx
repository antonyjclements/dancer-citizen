import { formatPlainText } from "@/foundation/formatters/formatPlainText";

type ContentHeaderPage = {
  uid: string;
  data: {
    hero_title?: string | null;
    hero_subtitle?: string | null;
    title?: string | null;
  };
};

type ContentHeaderProps = {
  page: ContentHeaderPage;
};

export function ContentHeader({ page }: ContentHeaderProps) {
  const title = formatPlainText(page.data.hero_title || page.data.title || page.uid);

  return (
    <section
      className="pt-36 pb-20 px-6 md:px-8"
      style={{
        background: [
          "radial-gradient(ellipse 60% 40% at 30% 50%, rgba(160, 140, 120, 0.08), transparent)",
          "#fcfaf5",
        ].join(", "),
      }}
    >
      <div className="max-w-[720px] mx-auto">
        <h1 className="font-display text-[clamp(40px,5vw,56px)] font-light leading-[1.15] text-ink mb-0">
          {title}
        </h1>
        {page.data.hero_subtitle ? (
          <p className="text-[16px] text-[#888] mt-5">{page.data.hero_subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
