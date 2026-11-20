import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ApplicationsList from "@/components/admin/ApplicationsList";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import {
  APPLICATION_FILTERS,
  listApplications,
  parseFilter,
  type ApplicationFilter,
} from "@/lib/queries/admin-applications";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications", robots: { index: false } };

function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Applications">
        <p>Oldest first, so nobody waits longest. Open an application to review and decide.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading applications…</p>}>
          <ApplicationsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function ApplicationsContent({
  searchParams,
}: Pick<PageProps<"/admin/applications">, "searchParams">) {
  await requireRole("admin");
  const filter = parseFilter((await searchParams).status);
  const items = await listApplications(filter);

  return (
    <div className="space-y-6">
      <nav aria-label="Filter applications" className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(APPLICATION_FILTERS) as ApplicationFilter[]).map((key) => (
          <Link
            key={key}
            href={`/admin/applications?status=${key}`}
            aria-current={key === filter ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
              key === filter
                ? "border-brand bg-brand text-on-brand"
                : "border-border bg-card text-primary hover:bg-muted",
            )}
          >
            {APPLICATION_FILTERS[key].label}
          </Link>
        ))}
      </nav>
      <ApplicationsList key={filter} items={items} />
    </div>
  );
}

export default ApplicationsPage;
