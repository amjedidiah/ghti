import type { Metadata } from "next";
import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Lecturer area", robots: { index: false } };

/**
 * Where lecturers land after signing in. Their courses, content and grade
 * entry arrive in steps 3.2 and 3.3; until then this page says so.
 */
function TeachPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Lecturer area" title="Welcome" />}>
      <TeachWelcome />
    </Suspense>
  );
}

async function TeachWelcome() {
  const user = await requireRole("lecturer");
  return (
    <>
      <PageHeader eyebrow="Lecturer area" title={`Welcome, ${user.fullName || "lecturer"}`}>
        <p>Your GHTI staff account is ready.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-bold text-primary">Coming soon</h2>
          <p className="mt-2 leading-relaxed text-secondary">
            This is where you will see the courses you teach each term, share lecture videos and
            materials, and enter your students&apos; scores. The registrar will let you know when it
            opens. Until then, there is nothing you need to do here.
          </p>
        </section>
        <SignOutButton />
      </div>
    </>
  );
}

export default TeachPage;
