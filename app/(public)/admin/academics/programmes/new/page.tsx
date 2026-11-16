import type { Metadata } from "next";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ProgrammeForm from "@/components/admin/ProgrammeForm";
import { createProgramme } from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import { emptyProgrammeValues } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "New programme", robots: { index: false } };

function NewProgrammePage() {
  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/academics", label: "Academics" }}
        title="New programme"
      >
        <p>It stays a draft, hidden from the website, until you publish it.</p>
      </AdminPageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading…</p>}>
          <NewProgrammeForm />
        </Suspense>
      </div>
    </>
  );
}

async function NewProgrammeForm() {
  await requireRole("admin");
  return (
    <ProgrammeForm
      action={createProgramme}
      defaultValues={emptyProgrammeValues}
      submitLabel="Create programme"
    />
  );
}

export default NewProgrammePage;
