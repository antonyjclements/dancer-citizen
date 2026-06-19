import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-[#ccc] px-6 md:px-8 pt-16 pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 max-w-[1200px] mx-auto">
        <div>
          <div className="font-display text-2xl font-semibold text-white mb-4">
            The Dancer-Citizen
          </div>
          <p className="text-[14px] leading-[1.7] text-[#999] m-0">
            An online, open-access, peer-reviewed scholarly journal exploring the work of socially engaged dance artists.
          </p>
        </div>

        <div>
          <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#666] mb-4">
            Contact
          </div>
          <div className="flex flex-col gap-1 text-[14px] text-[#999]">
            <span>info@dancercitizen.org</span>
            <span>PO Box 324, Tarrytown</span>
            <span>NY 10591, USA</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#666] mb-4">
            Support Us
          </div>
          <p className="text-[14px] leading-[1.7] text-[#999] m-0">
            Make a tax-deductible donation to support our work and the work of our contributing artists.
          </p>
          <Link
            href="/support-us"
            className="inline-block mt-4 text-[12px] font-bold tracking-[0.08em] uppercase text-white border-b border-white/30 pb-0.5"
          >
            Donate →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 max-w-[1200px] mx-auto mt-12 pt-6 border-t border-white/8 text-[#555] text-xs">
        <span>© 2026 The Dancer-Citizen, a project of Evolve Dance Inc.</span>
        <span>ISSN (forthcoming)</span>
      </div>
    </footer>
  );
}
