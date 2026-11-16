"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ghtiNavLinks } from "@/lib/site";

/** Menu for phones and tablets: GHTI's own links. The account button stays in the header; CRM links are in the footer. */
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
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-on-brand hover:bg-brand-deep"
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {open && (
        <nav
          id={panelId}
          aria-label="Site menu"
          className="surface-light absolute inset-x-0 top-full z-50 border-t border-border bg-card shadow-lg"
        >
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
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
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}

export default MobileMenu;
