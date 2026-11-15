import type { Metadata } from "next";
import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

// Placeholder admin home. Application review arrives in step 1.4.
function AdminPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Admin" title="Admin dashboard" />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const user = await requireRole("admin");

  return (
    <>
      <PageHeader eyebrow="Admin" title={`Welcome, ${user.fullName || "admin"}`}>
        <p>Reviewing applications is coming soon. New applications will be listed here.</p>
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

export default AdminPage;
