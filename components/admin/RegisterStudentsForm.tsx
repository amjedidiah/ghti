"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useMemo, useState } from "react";

import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { inputClassName } from "@/components/forms/TextInput";
import { cn } from "@/lib/utils";
import { initialFormState, type FormState } from "@/lib/validation/auth";

export type RegisterOffering = {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  year: number;
  semester: number;
  registrations: number;
  classListHref: string;
};

export type RegisterStudent = {
  id: string;
  matricNo: string;
  name: string;
  entryTerm: string;
  registeredOn: number;
};

const checkboxClass = "size-5 shrink-0 rounded border-border accent-brand";

/**
 * Tick courses and students, then register every ticked student on every
 * ticked course. Existing registrations are skipped, so saving twice is safe.
 */
function RegisterStudentsForm({
  action,
  offerings,
  students,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  offerings: RegisterOffering[];
  students: RegisterStudent[];
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [offeringIds, setOfferingIds] = useState(() => new Set(offerings.map((o) => o.id)));
  const [studentIds, setStudentIds] = useState(() => new Set(students.map((s) => s.id)));
  const [query, setQuery] = useState("");
  const searchId = useId();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      students
        .filter((s) => s.name.toLowerCase().includes(q) || s.matricNo.toLowerCase().includes(q))
        .map((s) => s.id),
    );
  }, [query, students]);

  function toggle(
    setter: (update: (current: Set<string>) => Set<string>) => void,
    ids: string[],
    on: boolean,
  ) {
    setter((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const pairs = offeringIds.size * studentIds.size;
  const shownStudentIds = students.filter((s) => !visible || visible.has(s.id)).map((s) => s.id);

  return (
    <form action={formAction} className="space-y-8 pb-28">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <Checklist
          title="Courses"
          allLabel="All courses"
          allChecked={offeringIds.size === offerings.length}
          someChecked={offeringIds.size > 0}
          onAll={(on) =>
            toggle(
              setOfferingIds,
              offerings.map((o) => o.id),
              on,
            )
          }
        >
          {offerings.map((offering) => (
            <Row key={offering.id}>
              <input
                id={`offering-${offering.id}`}
                type="checkbox"
                name="offeringId"
                value={offering.id}
                checked={offeringIds.has(offering.id)}
                onChange={(event) => toggle(setOfferingIds, [offering.id], event.target.checked)}
                className={checkboxClass}
              />
              <label htmlFor={`offering-${offering.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="font-semibold text-primary tabular-nums">{offering.code}</span>{" "}
                <span className="text-primary">{offering.title}</span>
                <span className="block text-sm text-secondary">
                  Year {offering.year}, semester {offering.semester} · {offering.creditUnits} CU
                </span>
              </label>
              <Link
                href={offering.classListHref}
                className="shrink-0 text-sm font-semibold text-accent-strong tabular-nums hover:underline"
              >
                {offering.registrations} registered
              </Link>
            </Row>
          ))}
        </Checklist>

        <Checklist
          title="Students"
          allLabel={visible ? "All shown" : "All students"}
          allChecked={
            shownStudentIds.length > 0 && shownStudentIds.every((id) => studentIds.has(id))
          }
          someChecked={shownStudentIds.some((id) => studentIds.has(id))}
          onAll={(on) => toggle(setStudentIds, shownStudentIds, on)}
          search={
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Find a student by name or matric number
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
                aria-hidden
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find by name or matric number"
                className={cn(inputClassName, "py-2.5 pl-9")}
              />
            </div>
          }
        >
          {students.map((student) => (
            // Filtered-out rows stay in the form (hidden), so their ticks still count.
            <Row key={student.id} hidden={Boolean(visible && !visible.has(student.id))}>
              <input
                id={`student-${student.id}`}
                type="checkbox"
                name="studentId"
                value={student.id}
                checked={studentIds.has(student.id)}
                onChange={(event) => toggle(setStudentIds, [student.id], event.target.checked)}
                className={checkboxClass}
              />
              <label htmlFor={`student-${student.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="font-semibold text-primary">
                  {student.name || student.matricNo}
                </span>
                <span className="block text-sm text-secondary tabular-nums">
                  {student.matricNo}
                  {student.entryTerm && ` · started ${student.entryTerm}`}
                </span>
              </label>
              <span className="shrink-0 text-sm text-secondary tabular-nums">
                {student.registeredOn}/{offerings.length}
              </span>
            </Row>
          ))}
          {visible && visible.size === 0 && (
            <li className="px-4 py-6 text-center text-sm text-secondary">No student matches.</li>
          )}
        </Checklist>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-md">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-secondary tabular-nums" aria-live="polite">
            {studentIds.size} student{studentIds.size === 1 ? "" : "s"} × {offeringIds.size} course
            {offeringIds.size === 1 ? "" : "s"}
            <span className="hidden sm:inline"> = up to {pairs} registrations</span>
          </p>
          <SubmitButton className="w-auto">Register</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function Checklist({
  title,
  allLabel,
  allChecked,
  someChecked,
  onAll,
  search,
  children,
}: {
  title: string;
  allLabel: string;
  allChecked: boolean;
  someChecked: boolean;
  onAll: (on: boolean) => void;
  search?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className="font-display text-2xl font-bold tracking-tight text-primary"
      >
        {title}
      </h2>
      {search && <div className="mt-4">{search}</div>}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <label
          htmlFor={`${id}-all`}
          className="flex cursor-pointer items-center gap-3 border-b border-border bg-muted px-4 py-3"
        >
          <input
            id={`${id}-all`}
            type="checkbox"
            checked={allChecked}
            ref={(element) => {
              if (element) element.indeterminate = someChecked && !allChecked;
            }}
            onChange={(event) => onAll(event.target.checked)}
            className={checkboxClass}
          />
          <span className="text-sm font-semibold text-primary">{allLabel}</span>
        </label>
        <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">{children}</ul>
      </div>
    </section>
  );
}

function Row({ hidden, children }: { hidden?: boolean; children: React.ReactNode }) {
  return (
    <li hidden={hidden} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
      {children}
    </li>
  );
}

export default RegisterStudentsForm;
