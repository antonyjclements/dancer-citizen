export function HomeHero() {
  return (
    <section
      className="relative flex flex-col justify-end min-h-[85vh] overflow-hidden px-6 md:px-8 pb-16 md:pb-20"
      style={{
        background: [
          "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(180, 160, 140, 0.15), transparent)",
          "radial-gradient(ellipse 60% 50% at 80% 60%, rgba(140, 120, 160, 0.1), transparent)",
          "radial-gradient(ellipse 90% 40% at 50% 90%, rgba(160, 140, 120, 0.08), transparent)",
          "#fcfaf5",
        ].join(", "),
      }}
    >
      {/* Decorative vertical line */}
      <div className="absolute left-[10%] top-[20%] w-px h-[40%] bg-gradient-to-b from-transparent via-black/8 to-transparent" />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto">
        <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-faint mb-6">
          Open-Access · Peer-Reviewed · Est. 2015
        </p>
        <h1 className="font-display text-[clamp(48px,8vw,96px)] font-light leading-[1.05] tracking-[-0.03em] text-ink mb-8 max-w-[900px]">
          The
          <br />
          Dancer-Citizen
        </h1>
        <p className="text-[18px] leading-[1.7] text-muted max-w-[560px] m-0">
          A scholarly journal exploring the work of socially engaged dance artists, where embodied knowledge meets public intellectual life.
        </p>
      </div>
    </section>
  );
}
