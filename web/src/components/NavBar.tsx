"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Badge from "@/components/Badge";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/weddings", label: "Weddings" },
  { href: "/vendors", label: "Vendors" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const firstName = user?.name.split(" ")[0] ?? "";

  async function handleLogout() {
    setOpen(false);
    setUserMenuOpen(false);
    await logout();
    router.replace("/login");
  }

  // Close the mobile menu and user dropdown whenever the route changes.
  useEffect(() => {
    setOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open && !userMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, userMenuOpen]);

  // Close the user dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!userMenuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [userMenuOpen]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname?.startsWith(href);
  }

  return (
    <nav className="relative z-30 bg-wine-500">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-10 xl:px-14">
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
          {user && (
            <div className="relative ml-2" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 rounded-full border border-ivory/25 px-3.5 py-1.5 text-sm font-medium text-ivory/85 transition-colors hover:bg-ivory/15 hover:text-ivory"
              >
                <span>{firstName}</span>
                {user.role === "assistant" && <Badge tone="gold">Assistant</Badge>}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-lg border border-gold-100 bg-ivory py-1 shadow-soft-lg">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm font-medium text-wine-600 transition-colors hover:bg-wine-50"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
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
              {user && (
                <div className="mt-1 border-t border-gold-100 pt-3">
                  <div className="flex items-center gap-2 px-4 py-1">
                    <span className="text-sm font-medium text-plum">{user.name}</span>
                    {user.role === "assistant" && <Badge tone="gold">Assistant</Badge>}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex min-h-[44px] w-full items-center rounded-lg px-4 text-left text-base font-medium text-wine-600 transition-colors hover:bg-wine-50"
                  >
                    Log out
                  </button>
                </div>
              )}
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
