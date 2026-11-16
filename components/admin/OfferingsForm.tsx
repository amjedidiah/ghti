"use client";

import { Lock } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import LevelBadge from "@/components/programmes/LevelBadge";
import type { ProgrammeLevel } from "@/lib/programmes";
import { initialFormState, type FormState } from "@/lib/validation/auth";

export type OfferingCourse = {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  /** Registered students, or null when the course is not offered this term. */
  registrations: number | null;
};

export type OfferingProgramme = {
  id: string;
  title: string;
  level: ProgrammeLevel;
  archived: boolean;
  groups: { label: string; courses: OfferingCourse[] }[];
};

const checkboxClass = "size-5 shrink-0 rounded border-border accent-brand";

/**
 * Tick the courses that run in a term. Courses with registered students are
 * locked on (their registrations depend on the offering) and are always
 * submitted through a hidden field.
 */
function OfferingsForm({
  action,
  programmes,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  programmes: OfferingProgramme[];
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [selected, setSelected] = useState(
    () =>
      new Set(
        programmes.flatMap((programme) =>
          programme.groups.flatMap((group) =>
            group.courses
              .filter((course) => course.registrations !== null)
              .map((course) => course.id),
          ),
        ),
      ),
  );

  function toggle(ids: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-10 pb-28">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      {programmes.map((programme) => (
        <section key={programme.id} aria-labelledby={`programme-${programme.id}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id={`programme-${programme.id}`}
              className="font-display text-2xl font-bold tracking-tight text-primary"
            >
              {programme.title}
            </h2>
            <LevelBadge level={programme.level} />
            {programme.archived && <span className="text-sm text-secondary">(archived)</span>}
          </div>

          <div className="mt-4 space-y-5">
            {programme.groups.map((group) => (
              <CourseGroup
                key={group.label}
                programmeId={programme.id}
                label={group.label}
                courses={group.courses}
                selected={selected}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-md">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-secondary tabular-nums" aria-live="polite">
            {selected.size} course{selected.size === 1 ? "" : "s"} ticked
          </p>
          <SubmitButton className="w-auto">Save offerings</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function CourseGroup({
  programmeId,
  label,
  courses,
  selected,
  onToggle,
}: {
  programmeId: string;
  label: string;
  courses: OfferingCourse[];
  selected: Set<string>;
  onToggle: (ids: string[], on: boolean) => void;
}) {
  const groupRef = useRef<HTMLInputElement>(null);
  const editable = courses.filter((course) => !(course.registrations && course.registrations > 0));
  const ticked = editable.filter((course) => selected.has(course.id)).length;
  const all = editable.length > 0 && ticked === editable.length;
  const groupId = `group-${programmeId}-${label.replace(/\W+/g, "-")}`;

  useEffect(() => {
    if (groupRef.current) groupRef.current.indeterminate = ticked > 0 && !all;
  }, [ticked, all]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <label
        htmlFor={groupId}
        className="flex cursor-pointer items-center gap-3 border-b border-border bg-muted px-4 py-3"
      >
        <input
          ref={groupRef}
          id={groupId}
          type="checkbox"
          checked={all}
          disabled={editable.length === 0}
          onChange={(event) =>
            onToggle(
              editable.map((course) => course.id),
              event.target.checked,
            )
          }
          className={checkboxClass}
        />
        <span className="text-sm font-semibold text-primary">{label}</span>
        <span className="ml-auto text-sm text-secondary">All in this group</span>
      </label>
      <ul className="divide-y divide-border">
        {courses.map((course) => {
          const locked = Boolean(course.registrations && course.registrations > 0);
          const inputId = `course-${course.id}`;
          return (
            <li key={course.id}>
              <label
                htmlFor={inputId}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted has-disabled:cursor-default has-disabled:hover:bg-transparent"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  name={locked ? undefined : "courseId"}
                  value={course.id}
                  checked={locked || selected.has(course.id)}
                  disabled={locked}
                  onChange={(event) => onToggle([course.id], event.target.checked)}
                  className={checkboxClass}
                />
                {locked && <input type="hidden" name="courseId" value={course.id} />}
                <span className="w-20 shrink-0 font-semibold text-primary tabular-nums">
                  {course.code}
                </span>
                <span className="min-w-0 flex-1 text-primary">{course.title}</span>
                {locked ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm text-secondary tabular-nums">
                    <Lock className="size-3.5" aria-hidden />
                    {course.registrations} registered
                  </span>
                ) : (
                  <span className="shrink-0 text-sm text-secondary tabular-nums">
                    {course.creditUnits} CU
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default OfferingsForm;
