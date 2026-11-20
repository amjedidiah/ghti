import type { Metadata } from "next";
import { Suspense } from "react";

import ScheduleList from "@/components/content/ScheduleList";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { listProgrammeSchedules } from "@/lib/queries/content";
import { getMyProgrammeId } from "@/lib/queries/student";

export const metadata: Metadata = { title: "Lecture schedules", robots: { index: false } };

/** The lecture timetables for the student's programme. */
function SchedulesPage() {
  return (
    <>
      <PageHeader eyebrow="Student portal" title="Lecture schedules">
        <p>Timetables for your programme, newest term first.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading schedules…</p>}>
          <Schedules />
        </Suspense>
      </div>
    </>
  );
}

async function Schedules() {
  const user = await requireRole("student");
  const programmeId = await getMyProgrammeId(user.id);
  const schedules = programmeId ? await listProgrammeSchedules(programmeId) : [];
  if (schedules.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        No lecture schedules have been shared yet.
      </p>
    );
  }
  return <ScheduleList schedules={schedules} headingLevel={2} />;
}

export default SchedulesPage;
