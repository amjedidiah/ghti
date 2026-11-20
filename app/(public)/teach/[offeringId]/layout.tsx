import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AreaNav from "@/components/layout/AreaNav";
import { requireRole } from "@/lib/auth/session";
import { getMyOffering } from "@/lib/queries/teach";
import { isUuid } from "@/lib/utils";
import { termLabel } from "@/lib/validation/academics";

/** One course the lecturer teaches: its title and tabs. */
function OfferingLayout({ children, params }: LayoutProps<"/teach/[offeringId]">) {
  return (
    <>
      <Suspense fallback={<div className="h-36 border-b border-border bg-muted" aria-hidden />}>
        <OfferingHeader params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function OfferingHeader({ params }: Pick<LayoutProps<"/teach/[offeringId]">, "params">) {
  await requireRole("lecturer");
  const { offeringId } = await params;
  const offering = isUuid(offeringId) ? await getMyOffering(offeringId) : null;
  if (!offering) notFound();

  const base = `/teach/${offering.id}`;
  return (
    <div className="border-b border-border bg-muted">
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/teach"
          className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-primary"
        >
          <ChevronLeft className="size-4" aria-hidden />
          My courses
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-primary">
          {offering.course.code}: {offering.course.title}
        </h1>
        <p className="mt-1 text-sm text-secondary">{termLabel(offering.term)}</p>
        <div className="mt-4">
          <AreaNav
            label="Course"
            root={base}
            links={[
              { href: base, label: "Overview" },
              { href: `${base}/content`, label: "Content" },
              { href: `${base}/students`, label: "Students" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default OfferingLayout;
