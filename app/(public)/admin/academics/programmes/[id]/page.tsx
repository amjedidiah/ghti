import { ChevronRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ScheduleForm from "@/components/admin/ScheduleForm";
import ScheduleList from "@/components/content/ScheduleList";
import ConfirmDeleteButton from "@/components/shared/ConfirmDeleteButton";
import CourseForm from "@/components/admin/CourseForm";
import ProgrammeForm from "@/components/admin/ProgrammeForm";
import ProgrammeStatusBadge from "@/components/admin/ProgrammeStatusBadge";
import LevelBadge from "@/components/programmes/LevelBadge";
import {
  createCourse,
  createSchedule,
  deleteSchedule,
  updateProgramme,
} from "@/lib/admin/academics";
import { requireRole } from "@/lib/auth/session";
import {
  getProgrammeForAdmin,
  listTermsForAdmin,
  isUuid,
  type ProgrammeForAdmin,
} from "@/lib/queries/admin-academics";
import { listProgrammeSchedules } from "@/lib/queries/content";
import { emptyCourseValues, programmeRowValues, termLabel } from "@/lib/validation/academics";

export const metadata: Metadata = { title: "Programme", robots: { index: false } };

function ProgrammePage({ params }: PageProps<"/admin/academics/programmes/[id]">) {
  return (
    <Suspense
      fallback={
        <p className="mx-auto w-full max-w-7xl px-4 py-10 text-secondary">Loading programme…</p>
      }
    >
      <ProgrammeContent params={params} />
    </Suspense>
  );
}

async function ProgrammeContent({
  params,
}: Pick<PageProps<"/admin/academics/programmes/[id]">, "params">) {
  await requireRole("admin");
  const { id } = await params;
  const programme = isUuid(id) ? await getProgrammeForAdmin(id) : null;
  if (!programme) notFound();
  const [schedules, terms] = await Promise.all([
    listProgrammeSchedules(programme.id),
    listTermsForAdmin(),
  ]);

  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/academics", label: "Academics" }}
        title={programme.title}
        badges={
          <>
            <LevelBadge level={programme.level} />
            <ProgrammeStatusBadge status={programme.status} />
          </>
        }
      >
        {programme.status === "published" ? (
          <Link
            href={`/academics/${programme.slug}`}
            className="inline-flex items-center gap-1 font-semibold text-accent-strong hover:underline"
          >
            View on the website
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        ) : (
          <p>Not on the website: publish it to show it.</p>
        )}
      </AdminPageHeader>

      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8">
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="font-display text-2xl font-bold text-primary">
            Details
          </h2>
          <div className="mt-5">
            <ProgrammeForm
              key={programme.id}
              action={updateProgramme.bind(null, programme.id)}
              defaultValues={programmeRowValues(programme)}
              submitLabel="Save changes"
            />
          </div>
        </section>

        <section aria-labelledby="courses-heading" className="space-y-8">
          <div>
            <h2 id="courses-heading" className="font-display text-2xl font-bold text-primary">
              Courses
            </h2>
            <div className="mt-5">
              <CourseList courses={programme.courses} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-display text-xl font-bold text-primary">Add a course</h3>
            <div className="mt-4">
              <CourseForm
                action={createCourse.bind(null, programme.id)}
                defaultValues={emptyCourseValues}
                submitLabel="Add course"
                clearOnSuccess
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="schedules-heading" className="space-y-6 lg:col-span-2">
          <div>
            <h2 id="schedules-heading" className="font-display text-2xl font-bold text-primary">
              Lecture schedules
            </h2>
            <p className="mt-2 text-secondary">
              Timetables as Google Drive files. They show on the programme page once it is
              published, and in its students&apos; portal.
            </p>
          </div>
          {schedules.length === 0 ? (
            <p className="text-sm text-secondary">No schedules yet.</p>
          ) : (
            <ScheduleList
              schedules={schedules}
              actions={(schedule) => (
                <ConfirmDeleteButton
                  label={schedule.title}
                  action={deleteSchedule.bind(null, schedule.id)}
                />
              )}
            />
          )}
          {terms.length > 0 && (
            <div className="max-w-2xl rounded-xl border border-border bg-card p-5 sm:p-6">
              <h3 className="font-display text-xl font-bold text-primary">Add a schedule</h3>
              <div className="mt-4">
                <ScheduleForm
                  action={createSchedule.bind(null, programme.id)}
                  terms={terms.map((term) => ({ id: term.id, label: termLabel(term) }))}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

type Course = ProgrammeForAdmin["courses"][number];

/** Courses grouped by year and semester, with credit-unit totals. */
function CourseList({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        No courses yet. Add the first one below.
      </p>
    );
  }

  const groups = new Map<string, Course[]>();
  for (const course of courses) {
    const key = `Year ${course.year}, semester ${course.semester}`;
    groups.set(key, [...(groups.get(key) ?? []), course]);
  }

  return (
    <div className="space-y-6">
      {[...groups].map(([label, group]) => {
        const units = group.reduce((sum, course) => sum + course.credit_units, 0);
        return (
          <div key={label}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-primary">{label}</h3>
              <p className="text-sm text-secondary tabular-nums">
                {units} credit unit{units === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {group.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/admin/academics/courses/${course.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted"
                  >
                    <span className="w-20 shrink-0 font-semibold text-primary tabular-nums">
                      {course.code}
                    </span>
                    <span className="min-w-0 flex-1 text-primary">{course.title}</span>
                    <span className="shrink-0 text-sm text-secondary tabular-nums">
                      {course.credit_units} CU
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-secondary" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default ProgrammePage;
