"use client";

import { Lock } from "lucide-react";
import { useActionState, useId, useState } from "react";

import Field from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import { inputClassName } from "@/components/forms/TextInput";
import ImportScores from "@/components/grades/ImportScores";
import type { ScoreChange } from "@/lib/grade-import";
import { isLocked, type GradeStatus, type SheetMode } from "@/lib/grade-sheet";
import { gradeFor, parseScore, totalScore, type GradeBand } from "@/lib/grades";
import { cn } from "@/lib/utils";
import { initialFormState, type FormState } from "@/lib/validation/auth";

export type SheetRow = {
  registrationId: string;
  name: string;
  matric: string;
  ca: string;
  exam: string;
  status: GradeStatus | null;
};

const STATUS: Record<GradeStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-accent-soft/40 text-accent-strong ring-accent/40" },
  submitted: { label: "Submitted", className: "bg-brand/10 text-brand ring-brand/30" },
  published: { label: "Published", className: "bg-success-soft text-success ring-success/30" },
};

const MODE: Record<SheetMode, { finalise: string; hint: string }> = {
  admin: {
    finalise: "Save and publish",
    hint: "Publishing shows complete grades to students.",
  },
  lecturer: {
    finalise: "Save and submit for approval",
    hint: "Submitting sends complete grades to the office. You cannot change them afterwards unless they are returned to you.",
  },
};

/**
 * One course's grade sheet, for admins and lecturers. Totals and letters
 * preview as you type (from the real grading scale); the database works out
 * the stored ones on save. Admins publish, and changing a published grade asks
 * for a reason, kept on record. Lecturers submit for approval, and see
 * submitted and published grades read-only.
 */
function GradeSheetForm({
  mode,
  action,
  rows,
  scale,
  split,
}: {
  mode: SheetMode;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  rows: SheetRow[];
  scale: GradeBand[];
  split: { ca: number; exam: number };
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [values, setValues] = useState(
    () => new Map(rows.map((row) => [row.registrationId, { ca: row.ca, exam: row.exam }])),
  );
  const [reason, setReason] = useState("");
  const reasonId = useId();

  // A successful save stores the reason with the change; start the next one
  // empty. Adjusted during render when a new result arrives (no effect needed).
  const [lastState, setLastState] = useState(state);
  // Each save starts the import afresh, so its "filled in" note does not linger.
  const [importKey, setImportKey] = useState(0);
  if (lastState !== state) {
    setLastState(state);
    if (state.status === "success") setReason("");
    setImportKey((key) => key + 1);
  }

  const original = new Map(rows.map((row) => [row.registrationId, row]));
  const publishedEdited =
    mode === "admin" &&
    rows.some((row) => {
      const value = values.get(row.registrationId);
      return row.status === "published" && (value?.ca !== row.ca || value?.exam !== row.exam);
    });
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  function set(registrationId: string, part: "ca" | "exam", value: string) {
    setValues((current) => {
      const next = new Map(current);
      const row = next.get(registrationId) ?? { ca: "", exam: "" };
      next.set(registrationId, { ...row, [part]: value });
      return next;
    });
  }

  function fillIn(changes: ScoreChange[]) {
    setValues((current) => {
      const next = new Map(current);
      for (const change of changes) {
        next.set(change.registrationId, { ca: change.ca.to, exam: change.exam.to });
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <ImportScores
        key={importKey}
        split={split}
        onApply={fillIn}
        rows={rows.map((row) => {
          const value = values.get(row.registrationId) ?? { ca: "", exam: "" };
          return {
            registrationId: row.registrationId,
            matric: row.matric,
            name: row.name,
            ca: value.ca,
            exam: value.exam,
            locked: isLocked(mode, row.status),
          };
        })}
      />
      <form action={formAction} className="space-y-6 pb-28">
        {state.message && state.status !== "idle" && (
          <FormMessage status={state.status} message={state.message} />
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_6rem_6rem_7rem] gap-3 border-b border-border bg-muted px-4 py-2.5 text-xs font-semibold tracking-wide text-secondary uppercase sm:grid"
          >
            <span>Student</span>
            <span>CA / {split.ca}</span>
            <span>Exam / {split.exam}</span>
            <span>Total</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const value = values.get(row.registrationId) ?? { ca: "", exam: "" };
              const ca = parseScore(value.ca, split.ca);
              const exam = parseScore(value.exam, split.exam);
              const valid = ca !== undefined && exam !== undefined;
              const total = valid ? totalScore(ca, exam) : null;
              const band = gradeFor(total, scale);
              const before = original.get(row.registrationId);
              const edited = value.ca !== before?.ca || value.exam !== before?.exam;
              const caError = errorFor(`ca:${row.registrationId}`);
              const examError = errorFor(`exam:${row.registrationId}`);
              const who = row.name || row.matric;
              const locked = isLocked(mode, row.status);

              return (
                <li
                  key={row.registrationId}
                  className="grid grid-cols-3 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_7rem] sm:items-center"
                >
                  <div className="col-span-3 min-w-0 sm:col-span-1">
                    <p className="font-semibold text-primary">{who}</p>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-secondary tabular-nums">
                      {row.matric}
                      {row.status && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                            STATUS[row.status].className,
                          )}
                        >
                          {(row.status === "published" || locked) && (
                            <Lock className="size-3" aria-hidden />
                          )}
                          {STATUS[row.status].label}
                        </span>
                      )}
                      {edited && (
                        <span className="text-xs font-semibold text-accent-strong">Edited</span>
                      )}
                    </p>
                  </div>
                  {locked ? (
                    <>
                      <LockedScore short={`CA / ${split.ca}`} value={row.ca} />
                      <LockedScore short={`Exam / ${split.exam}`} value={row.exam} />
                    </>
                  ) : (
                    <>
                      <ScoreInput
                        name={`ca:${row.registrationId}`}
                        label={`CA for ${who}`}
                        short={`CA / ${split.ca}`}
                        value={value.ca}
                        invalid={ca === undefined || Boolean(caError)}
                        error={caError ?? (ca === undefined ? `0 to ${split.ca}` : undefined)}
                        onChange={(next) => set(row.registrationId, "ca", next)}
                      />
                      <ScoreInput
                        name={`exam:${row.registrationId}`}
                        label={`Exam for ${who}`}
                        short={`Exam / ${split.exam}`}
                        value={value.exam}
                        invalid={exam === undefined || Boolean(examError)}
                        error={examError ?? (exam === undefined ? `0 to ${split.exam}` : undefined)}
                        onChange={(next) => set(row.registrationId, "exam", next)}
                      />
                    </>
                  )}
                  <div className="self-end pb-2.5 sm:self-center sm:pb-0" aria-live="polite">
                    <span className="text-xs font-semibold text-secondary uppercase sm:hidden">
                      Total
                    </span>
                    <p className="text-primary tabular-nums">
                      {total === null ? (
                        <span className="text-secondary">—</span>
                      ) : (
                        <>
                          <span className="font-semibold">{total}</span>
                          {band && (
                            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-sm font-bold">
                              {band.letter}
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {publishedEdited && (
          <div className="rounded-xl border border-accent/50 bg-accent-soft/20 p-4 sm:p-5">
            <Field
              id={reasonId}
              label="Reason for changing published grades (required)"
              hint="Students have already seen these results. The reason, your name and the old and new scores are kept on record."
              error={errorFor("reason")}
            >
              <Textarea
                id={reasonId}
                name="reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                aria-invalid={Boolean(errorFor("reason"))}
              />
            </Field>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:shadow-md">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="mr-auto hidden text-sm text-secondary sm:block">{MODE[mode].hint}</p>
            <button
              type="submit"
              name="intent"
              value="save"
              className="rounded-md border border-brand bg-card px-4 py-3 text-base font-semibold text-brand hover:bg-muted"
            >
              Save draft
            </button>
            <SubmitButton className="w-auto" name="intent" value="finalise">
              {MODE[mode].finalise}
            </SubmitButton>
          </div>
          <p className="mt-2 text-xs text-secondary sm:hidden">{MODE[mode].hint}</p>
        </div>
      </form>
    </div>
  );
}

/** A score a lecturer can no longer change: shown, not sent with the form. */
function LockedScore({ short, value }: { short: string; value: string }) {
  return (
    <div className="self-end pb-2.5 sm:self-center sm:pb-0">
      <span className="text-xs font-semibold text-secondary uppercase sm:hidden">{short}</span>
      <p className="text-right text-primary tabular-nums sm:pr-2.5">
        {value === "" ? <span className="text-secondary">—</span> : value}
      </p>
    </div>
  );
}

function ScoreInput({
  name,
  label,
  short,
  value,
  invalid,
  error,
  onChange,
}: {
  name: string;
  label: string;
  short: string;
  value: string;
  invalid: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <span aria-hidden className="text-xs font-semibold text-secondary uppercase sm:hidden">
        {short}
      </span>
      <input
        name={name}
        value={value}
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClassName, "px-2.5 py-2 text-right tabular-nums")}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default GradeSheetForm;
