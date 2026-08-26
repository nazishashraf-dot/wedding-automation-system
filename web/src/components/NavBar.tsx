"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/weddings", label: "Weddings" },
  { href: "/vendors", label: "Vendors" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname?.startsWith(href);
  }

  return (
    <nav className="relative bg-wine-500">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-10 xl:px-14">
        <span className="shrink-0 font-heading text-xl font-semibold tracking-wide text-ivory">
          Wedding&nbsp;Studio
        </span>

        {/* Desktop nav — full inline links, pinned to the right edge. */}
        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-ivory text-wine-600 shadow-soft"
                  : "text-ivory/85 hover:bg-ivory/15 hover:text-ivory"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile — hamburger / close toggle. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ivory transition-colors hover:bg-ivory/15 md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <>
          {/* Backdrop: tapping it closes the menu without navigating. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute inset-x-0 top-full z-10 h-screen bg-plum/40 md:hidden"
          />

          {/* Mobile dropdown panel — stacked, generously-tappable links. */}
          <div className="absolute inset-x-0 top-full z-20 border-t border-gold-300 bg-ivory shadow-soft-lg md:hidden">
            <div className="flex flex-col gap-1 p-3">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-lg px-4 text-base font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-wine-500 text-ivory"
                      : "text-wine-600 hover:bg-wine-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Signature detail: a soft wavy line blending wine into the gold/sage
          accents, in place of a hard straight border. Purely decorative. */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-full block h-5 w-full text-wine-500 sm:h-6"
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="navWaveGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="55%" stopColor="#C9A96E" />
            <stop offset="100%" stopColor="#A8B79A" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 C 220,32 460,0 720,14 C 980,28 1220,4 1440,18 L1440,0 L0,0 Z"
          fill="url(#navWaveGradient)"
        />
      </svg>
    </nav>
  );
}
