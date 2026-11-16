import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import RegisterStudentsForm from "@/components/admin/RegisterStudentsForm";
import { registerStudents } from "@/lib/admin/registrations";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/queries/admin-academics";
import { getRegistrationSetup } from "@/lib/queries/admin-registrations";
import { cn } from "@/lib/utils";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Register students", robots: { index: false } };

function RegisterPage({ params, searchParams }: PageProps<"/admin/offerings/[termId]/register">) {
  return (
    <Suspense
      fallback={<p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading…</p>}
    >
      <RegisterContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterContent({
  params,
  searchParams,
}: Pick<PageProps<"/admin/offerings/[termId]/register">, "params" | "searchParams">) {
  await requireRole("admin");
  const { termId } = await params;
  const programme = (await searchParams).programme;
  const programmeId = typeof programme === "string" && isUuid(programme) ? programme : null;
  const setup = isUuid(termId) ? await getRegistrationSetup(termId, programmeId) : null;
  if (!setup) notFound();

  // One programme only: choose it for the admin.
  const chosen =
    setup.programmeId ?? (setup.programmes.length === 1 ? setup.programmes[0].id : null);
  const data =
    chosen && chosen !== setup.programmeId ? await getRegistrationSetup(termId, chosen) : setup;
  if (!data) notFound();
  const base = `/admin/offerings/${termId}`;

  return (
    <>
      <AdminPageHeader
        back={{ href: base, label: `Offerings: ${termLabel(data.term)}` }}
        title="Register students"
      >
        <p>
          Choose a programme, tick its students and this term&rsquo;s courses, then register.
          Students already registered are skipped.
        </p>
      </AdminPageHeader>

      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {data.programmes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
            No courses are offered this term yet.{" "}
            <Link href={base} className="font-semibold text-accent-strong">
              Choose the courses first
            </Link>
            .
          </p>
        ) : (
          <>
            <nav aria-label="Programme" className="-mx-1 flex gap-2 overflow-x-auto pb-1">
              {data.programmes.map((programme) => (
                <Link
                  key={programme.id}
                  href={`${base}/register?programme=${programme.id}`}
                  aria-current={programme.id === data.programmeId ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap",
                    programme.id === data.programmeId
                      ? "border-brand bg-brand text-on-brand"
                      : "border-border bg-card text-primary hover:bg-muted",
                  )}
                >
                  {programme.title}
                </Link>
              ))}
            </nav>

            {!data.programmeId ? (
              <p className="text-secondary">Choose a programme above.</p>
            ) : data.students.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
                This programme has no active students yet. Enrol admitted applicants from their
                application page first.
              </p>
            ) : (
              <RegisterStudentsForm
                key={data.programmeId}
                action={registerStudents.bind(null, termId, data.programmeId)}
                offerings={data.offerings.map((offering) => ({
                  ...offering,
                  classListHref: `${base}/${offering.id}`,
                }))}
                students={data.students}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

export default RegisterPage;
