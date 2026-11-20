import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import { getClassList, getMyOffering } from "@/lib/queries/teach";
import { isUuid } from "@/lib/utils";

export const metadata: Metadata = { title: "Course", robots: { index: false } };

/** A course's overview for its lecturer. */
function OfferingPage({ params }: PageProps<"/teach/[offeringId]">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-secondary">Loading…</p>}>
        <Overview params={params} />
      </Suspense>
    </div>
  );
}

async function Overview({ params }: Pick<PageProps<"/teach/[offeringId]">, "params">) {
  await requireRole("lecturer");
  const { offeringId } = await params;
  const offering = isUuid(offeringId) ? await getMyOffering(offeringId) : null;
  if (!offering) notFound();
  const students = await getClassList(offering.id);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-bold text-primary">Your class</h2>
      <p className="mt-2 text-secondary">
        {students.length === 0
          ? "Nobody is registered yet. The registrar registers students each term."
          : `${students.length} student${students.length === 1 ? " is" : "s are"} registered.`}{" "}
        {students.length > 0 && (
          <Link
            href={`/teach/${offering.id}/students`}
            className="font-semibold text-accent-strong hover:underline"
          >
            See the class list
          </Link>
        )}
      </p>
    </section>
  );
}

export default OfferingPage;
