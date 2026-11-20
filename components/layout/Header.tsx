import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AccountLink, SignInButton } from "@/components/layout/AccountLink";
import MobileMenu from "@/components/layout/MobileMenu";
import { ghtiNavLinks, site } from "@/lib/site";

/**
 * GHTI's own header: the app's navigation comes first. The wordmark spells
 * out what GHTI stands for (GHTI asked on 20 Nov 2026 that the header not
 * carry the CRM name, which read as the meaning of "GHTI"); the CRM links and
 * logo live in the footer (AGENTS.md "Design System").
 */
function Header() {
  return (
    <header className="surface-dark relative z-40 bg-brand text-on-brand">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/ghti-crest.svg"
            alt=""
            width={40}
            height={48}
            preload
            className="h-10 w-auto shrink-0 lg:h-12"
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-display text-2xl font-bold tracking-wide lg:text-3xl">
              {site.name}
            </span>
            {site.fullName && (
              <span className="mt-1 text-[0.7rem] leading-tight font-medium tracking-wide text-on-brand-muted lg:text-xs">
                {site.fullName}
              </span>
            )}
          </span>
        </Link>

        <div className="flex items-center gap-1 lg:gap-2">
          <nav aria-label={`${site.name} links`} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {ghtiNavLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-md px-3 py-2 text-sm font-medium text-on-brand-muted transition-colors hover:text-on-brand"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Suspense fallback={<SignInButton />}>
            <AccountLink />
          </Suspense>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

export default Header;
