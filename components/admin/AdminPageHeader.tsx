import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Title band for admin detail pages: a back link, the title, optional badges and a line of context. */
function AdminPageHeader({
  back,
  title,
  badges,
  children,
}: {
  back: { href: string; label: string };
  title: string;
  badges?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-primary">
            {title}
          </h1>
          {badges}
        </div>
        {children && <div className="mt-2 text-sm text-secondary">{children}</div>}
      </div>
    </div>
  );
}

export default AdminPageHeader;
