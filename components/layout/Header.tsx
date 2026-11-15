import Link from "next/link";
import { Suspense } from "react";

import { AccountLink, SignInButton } from "@/components/layout/AccountLink";
import MobileMenu from "@/components/layout/MobileMenu";
import { ghtiNavLinks, site } from "@/lib/site";

/**
 * GHTI's own header: the app's navigation comes first. The CRM affiliation
 * stays visible in the wordmark's tagline; the shared CRM links and logo live
 * in the footer (decision 15 Nov 2026, AGENTS.md "Design System").
 */
function Header() {
  return (
    <header className="relative z-40 bg-brand text-on-brand">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-2xl font-bold tracking-wide lg:text-3xl">
            {site.name}
          </span>
          <span className="mt-1 truncate text-[0.7rem] font-medium tracking-wide text-on-brand-muted lg:text-xs">
            {site.ministry}
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
