import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { listTermsWithOfferingCounts } from "@/lib/queries/admin-academics";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Offerings", robots: { index: false } };

function OfferingsPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Offerings">
        <p>Choose a term, then tick the courses that run in it. Students register on these.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading terms…</p>}>
          <TermList />
        </Suspense>
      </div>
    </>
  );
}

async function TermList() {
  await requireRole("admin");
  const terms = await listTermsWithOfferingCounts();

  if (terms.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        No terms yet.{" "}
        <Link href="/admin/academics/terms/new" className="font-semibold text-accent-strong">
          Add a term
        </Link>{" "}
        first.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {terms.map((term) => (
        <li key={term.id}>
          <Link
            href={`/admin/offerings/${term.id}`}
            className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted sm:px-5"
          >
            <span className="min-w-0">
              <span className="block font-semibold text-primary">{termLabel(term)}</span>
              <span className="mt-1 block text-sm text-secondary tabular-nums">
                {term.offeringCount === 0
                  ? "No courses offered yet"
                  : `${term.offeringCount} course${term.offeringCount === 1 ? "" : "s"} offered`}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-secondary" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default OfferingsPage;
