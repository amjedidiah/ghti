import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { countApplicationsByStatus } from "@/lib/queries/admin-applications";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

function AdminPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Admin" title="Overview" />}>
      <AdminOverview />
    </Suspense>
  );
}

async function AdminOverview() {
  const user = await requireRole("admin");
  const counts = await countApplicationsByStatus();
  const waiting = (counts.submitted ?? 0) + (counts.under_review ?? 0);

  const tiles = [
    { label: "Need review", value: waiting, href: "/admin/applications?status=needs-review" },
    { label: "Admitted", value: counts.admitted ?? 0, href: "/admin/applications?status=admitted" },
    {
      label: "Not admitted",
      value: counts.rejected ?? 0,
      href: "/admin/applications?status=rejected",
    },
    {
      label: "Drafts in progress",
      value: counts.draft ?? 0,
      href: "/admin/applications?status=drafts",
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin" title={`Welcome, ${user.fullName || "admin"}`}>
        <p>
          {waiting === 0
            ? "No applications are waiting for review."
            : `${waiting} application${waiting === 1 ? " is" : "s are"} waiting for review.`}
        </p>
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.label}>
              <Link
                href={tile.href}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md"
              >
                <span className="text-sm font-semibold text-secondary">{tile.label}</span>
                <span className="mt-1 font-display text-4xl font-bold text-primary lining-nums tabular-nums">
                  {tile.value}
                </span>
                <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-accent-strong">
                  View
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default AdminPage;
