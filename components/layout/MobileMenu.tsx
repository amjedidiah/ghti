"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { crmNavLinks, ghtiNavLinks, signInLink, site } from "@/lib/site";

/** One menu for phones and tablets: GHTI links first, then the shared CRM links. */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-secondary hover:bg-muted hover:text-primary"
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {open && (
        <nav
          id={panelId}
          aria-label="Site menu"
          className="absolute inset-x-0 top-full z-50 border-t border-border bg-card shadow-lg"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-accent-strong uppercase">
              {site.name}
            </p>
            <ul className="space-y-1">
              {ghtiNavLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="block rounded-md px-3 py-2.5 text-base font-medium text-primary hover:bg-muted"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={signInLink.href}
                  onClick={close}
                  className="block rounded-md px-3 py-2.5 text-base font-semibold text-accent-strong hover:bg-muted"
                >
                  {signInLink.name}
                </Link>
              </li>
            </ul>

            <p className="mt-4 border-t border-border px-3 pt-4 pb-1 text-xs font-semibold tracking-wider text-secondary uppercase">
              {site.ministry}
            </p>
            <ul className="space-y-1">
              {crmNavLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block rounded-md px-3 py-2.5 text-base font-medium text-secondary hover:bg-muted hover:text-primary"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}

export default MobileMenu;
