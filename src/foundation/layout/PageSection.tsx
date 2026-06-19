import type { ReactNode } from "react";

type PageSectionProps = {
  children: ReactNode;
  className?: string;
  width?: "narrow" | "wide";
};

export function PageSection({ children, className = "", width = "wide" }: PageSectionProps) {
  const innerClass = width === "narrow" ? "max-w-[720px]" : "max-w-[1200px]";

  return (
    <section className={`py-20 px-6 md:px-8 ${className}`}>
      <div className={`${innerClass} mx-auto`}>{children}</div>
    </section>
  );
}
