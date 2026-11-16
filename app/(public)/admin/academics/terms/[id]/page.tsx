import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import TermForm from "@/components/admin/TermForm";
import { updateTerm } from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import { getTermForAdmin, isUuid } from "@/lib/queries/admin-academics";
import { termLabel, termRowValues } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Term", robots: { index: false } };

function TermPage({ params }: PageProps<"/admin/academics/terms/[id]">) {
  return (
    <Suspense
      fallback={<p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading term…</p>}
    >
      <TermContent params={params} />
    </Suspense>
  );
}

async function TermContent({ params }: Pick<PageProps<"/admin/academics/terms/[id]">, "params">) {
  await requireRole("admin");
  const { id } = await params;
  const term = isUuid(id) ? await getTermForAdmin(id) : null;
  if (!term) notFound();

  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/academics", label: "Academics" }}
        title={termLabel(term)}
      >
        <p>
          {term.accepting_applications
            ? "Open for applications: applicants can choose it as their intake."
            : "Not open for applications."}{" "}
          <Link
            href={`/admin/offerings/${term.id}`}
            className="font-semibold text-accent-strong hover:underline"
          >
            Courses offered this term
          </Link>
        </p>
      </AdminPageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <TermForm
          key={term.id}
          action={updateTerm.bind(null, term.id)}
          defaultValues={termRowValues(term)}
          submitLabel="Save changes"
        />
      </div>
    </>
  );
}

export default TermPage;
