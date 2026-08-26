"use client";

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

  return (
    <nav className="relative bg-wine-500">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-8 sm:px-6 sm:py-4 lg:px-10 xl:px-14">
        <span className="shrink-0 font-heading text-xl font-semibold tracking-wide text-ivory">
          Wedding&nbsp;Studio
        </span>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:py-1.5 ${
                  active
                    ? "bg-ivory text-wine-600 shadow-soft"
                    : "text-ivory/85 hover:bg-ivory/15 hover:text-ivory"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

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
