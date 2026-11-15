import type { Metadata } from "next";
import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My application", robots: { index: false } };

// Placeholder applicant home. The application form arrives in step 1.3.
function ApplyPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Applicant" title="My application" />}>
      <ApplicantHome />
    </Suspense>
  );
}

async function ApplicantHome() {
  const user = await requireRole("applicant");

  return (
    <>
      <PageHeader eyebrow="Applicant" title={`Welcome, ${user.fullName || "applicant"}`}>
        <p>
          Your account is ready. The online application form is coming soon: you will fill it in
          here, upload your transcript and follow its progress.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-secondary">Signed in as {user.email}</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

export default ApplyPage;
