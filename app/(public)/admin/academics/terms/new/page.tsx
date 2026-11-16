import type { Metadata } from "next";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import TermForm from "@/components/admin/TermForm";
import { createTerm } from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import { emptyTermValues } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "New term", robots: { index: false } };

function NewTermPage() {
  return (
    <>
      <AdminPageHeader back={{ href: "/admin/academics", label: "Academics" }} title="New term">
        <p>
          A semester or term. Courses are offered in terms, and applicants choose one as their
          intake.
        </p>
      </AdminPageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading…</p>}>
          <NewTermForm />
        </Suspense>
      </div>
    </>
  );
}

async function NewTermForm() {
  await requireRole("admin");
  return <TermForm action={createTerm} defaultValues={emptyTermValues} submitLabel="Create term" />;
}

export default NewTermPage;
