import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import OfferingsForm, { type OfferingProgramme } from "@/components/admin/OfferingsForm";
import { saveOfferings } from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import {
  getTermOfferingsForAdmin,
  isUuid,
  type TermOfferings,
} from "@/lib/queries/admin-academics";
import { termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Term offerings", robots: { index: false } };

function TermOfferingsPage({ params }: PageProps<"/admin/offerings/[termId]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading offerings…</p>
      }
    >
      <TermOfferingsContent params={params} />
    </Suspense>
  );
}

async function TermOfferingsContent({
  params,
}: Pick<PageProps<"/admin/offerings/[termId]">, "params">) {
  await requireRole("admin");
  const { termId } = await params;
  const data = isUuid(termId) ? await getTermOfferingsForAdmin(termId) : null;
  if (!data) notFound();

  const programmes = toFormProgrammes(data);

  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/offerings", label: "Offerings" }}
        title={termLabel(data.term)}
      >
        <p>
          Tick the courses that run this term, then save. A course with registered students stays
          offered.
        </p>
        <Link
          href={`/admin/offerings/${data.term.id}/register`}
          className="mt-4 inline-flex items-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-deep"
        >
          Register students
        </Link>
      </AdminPageHeader>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {programmes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
            No courses yet.{" "}
            <Link href="/admin/academics" className="font-semibold text-accent-strong">
              Add courses to a programme
            </Link>{" "}
            first.
          </p>
        ) : (
          <OfferingsForm
            key={data.term.id}
            action={saveOfferings.bind(null, data.term.id)}
            programmes={programmes}
          />
        )}
      </div>
    </>
  );
}

/** Group each programme's courses by year and semester for the form. */
function toFormProgrammes({ programmes, offered, lecturers }: TermOfferings): OfferingProgramme[] {
  return programmes.map((programme) => {
    const groups = new Map<string, OfferingProgramme["groups"][number]>();
    for (const course of programme.courses) {
      const label = `Year ${course.year}, semester ${course.semester}`;
      const group = groups.get(label) ?? { label, courses: [] };
      group.courses.push({
        id: course.id,
        code: course.code,
        title: course.title,
        creditUnits: course.credit_units,
        registrations: offered.get(course.id) ?? null,
        lecturer: lecturers.get(course.id) ?? null,
      });
      groups.set(label, group);
    }
    return {
      id: programme.id,
      title: programme.title,
      level: programme.level,
      archived: programme.status === "archived",
      groups: [...groups.values()],
    };
  });
}

export default TermOfferingsPage;
