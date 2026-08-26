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
    <nav className="border-b border-gold-300 bg-ivory">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-4 sm:px-6">
        <span className="font-heading text-xl font-semibold tracking-wide text-wine-500">
          Wedding&nbsp;Studio
        </span>
        <div className="flex flex-wrap gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-wine-500 text-ivory"
                    : "text-wine-600/80 hover:bg-wine-50 hover:text-wine-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
