export function MemorialPanel() {
  return (
    <section className="bg-paper-deep px-6 md:px-8 py-20 text-center">
      <div className="max-w-[680px] mx-auto">
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-faint mb-8">
          In Memoriam
        </p>
        <h2 className="font-display text-[28px] font-normal italic leading-[1.5] text-ink mb-6">
          Jane Alexandre, Founding Editor
        </h2>
        <p className="font-display text-[18px] italic leading-[1.8] text-muted mb-6">
          {
            "\"I hold the convictions that dance is an intrinsic and universal human activity; that each of us has a social responsibility to all others; and that the opportunity to reach our individual capabilities in every realm is a basic human right.\""
          }
        </p>
        <div className="w-10 h-px bg-[#ccc] mx-auto" />
      </div>
    </section>
  );
}
