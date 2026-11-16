"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type AreaLink = { href: string; label: string };

/**
 * Sub-navigation for a signed-in area (admin, student portal): a row of links
 * under the site header that scrolls sideways on phones, with a fade showing
 * there is more. The current section is marked for screen readers and by an
 * underline.
 */
function AreaNav({
  label,
  root,
  links,
}: {
  label: string;
  /** The area's home: active only on exact match, so it isn't active everywhere. */
  root: string;
  links: readonly AreaLink[];
}) {
  const pathname = usePathname();
  const active =
    links.find((link) =>
      link.href === root
        ? pathname === root
        : pathname === link.href || pathname.startsWith(`${link.href}/`),
    )?.href ?? null;
  return <AreaNavLinks label={label} links={links} active={active} />;
}

/** The links themselves; also the Suspense fallback before the path is known. */
export function AreaNavLinks({
  label,
  links,
  active,
}: {
  label: string;
  links: readonly AreaLink[];
  active: string | null;
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-2 flex min-w-0 overflow-x-auto mask-[linear-gradient(to_right,black_80%,transparent)] pr-6 sm:mask-none sm:pr-0"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === active ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap",
            link.href === active
              ? "border-accent text-primary"
              : "border-transparent text-secondary hover:text-primary",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default AreaNav;
