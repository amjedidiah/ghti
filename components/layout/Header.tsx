import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AccountLink, SignInButton } from "@/components/layout/AccountLink";
import MobileMenu from "@/components/layout/MobileMenu";
import { crmNavLinks, ghtiNavLinks, site } from "@/lib/site";

import crmLogo from "@/public/brand/crm-logo.png";

/**
 * Shared CRM header (ported from cwl and protection): CRM logo and the six
 * crm-world.org.ng links, plus a GHTI row with the site's own links.
 */
function Header() {
  return (
    <header className="relative z-40">
      {/* Row 1: shared CRM chrome */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <a href={site.ministryUrl} className="flex shrink-0 items-center">
            <Image src={crmLogo} alt={site.ministry} priority className="h-10 w-auto lg:h-12" />
          </a>

          <nav aria-label={`${site.ministry} links`} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {crmNavLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="rounded-md px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-muted hover:text-brand"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <MobileMenu />
        </div>
      </div>

      {/* Row 2: GHTI */}
      <div className="bg-brand text-on-brand">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-14 lg:px-8">
          <Link href="/" className="font-display text-xl font-bold tracking-wide lg:text-2xl">
            {site.name}
          </Link>

          <nav aria-label={`${site.name} links`} className="flex items-center gap-1 lg:gap-2">
            <ul className="hidden items-center gap-1 lg:flex">
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
            <Suspense fallback={<SignInButton />}>
              <AccountLink />
            </Suspense>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
