import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

function AccountPage() {
  return (
    <>
      <PageHeader eyebrow="Student portal" title="Account" />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading…</p>}>
          <Account />
        </Suspense>
      </div>
    </>
  );
}

async function Account() {
  const user = await requireRole("student");
  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-secondary">Name</dt>
            <dd className="mt-1 text-primary">{user.fullName || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-secondary">Email (used to sign in)</dt>
            <dd className="mt-1 break-all text-primary">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-secondary">
          Your name and email can only be changed by the registrar.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-xl font-bold text-primary">Password</h2>
        <p className="mt-2 text-sm text-secondary">Choose a new password for this account.</p>
        <Link
          href="/reset-password"
          className="mt-4 inline-flex items-center rounded-md border border-brand bg-card px-4 py-2.5 text-sm font-semibold text-brand hover:bg-muted"
        >
          Change password
        </Link>
      </section>

      <SignOutButton />
    </>
  );
}

export default AccountPage;
