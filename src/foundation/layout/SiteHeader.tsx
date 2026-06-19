"use client";

import { useState } from "react";
import Link from "next/link";

type NavigationLink = {
  href: string;
  label: string;
};

const navigationLinks: NavigationLink[] = [
  { href: "/", label: "Issues" },
  { href: "/about", label: "About" },
  { href: "/submissions", label: "Submissions" },
  { href: "/contributors", label: "Contributors" },
  { href: "/support-us", label: "Support Us" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-paper-deep/92 backdrop-blur-md border-b border-black/6">
      <nav
        className="flex items-center justify-between max-w-[1200px] mx-auto h-[72px] px-6 md:px-8"
        aria-label="Primary navigation"
      >
        <Link
          href="/"
          className="font-display text-[22px] font-semibold tracking-tight text-white"
          onClick={closeMenu}
        >
          The Dancer-Citizen
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navigationLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className="text-[13px] font-semibold tracking-[0.06em] uppercase text-faint hover:text-ink border-b-[1.5px] border-transparent hover:border-current pb-0.5 transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex md:hidden flex-col gap-[5px] bg-transparent border-0 p-2 cursor-pointer"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="block w-6 h-[1.5px] bg-ink" />
          <span className="block w-6 h-[1.5px] bg-ink" />
          <span className="block w-6 h-[1.5px] bg-ink" />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {isMenuOpen ? (
        <div
          id="mobile-navigation"
          className="flex flex-col gap-4 px-6 py-4 border-t border-black/6 md:hidden"
        >
          {navigationLinks.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className="text-[14px] font-semibold tracking-[0.04em] uppercase text-faint hover:text-ink transition-colors"
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}
