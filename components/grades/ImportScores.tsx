"use client";

import { Download, FileUp } from "lucide-react";
import { useId, useRef, useState } from "react";

import FormMessage from "@/components/forms/FormMessage";
import {
  IMPORT_MAX_BYTES,
  planScoreImport,
  scoreTemplate,
  type ImportResult,
  type ImportSheetRow,
  type ScoreChange,
} from "@/lib/grade-import";

type Row = ImportSheetRow & { name: string };

const dash = (value: string) => (value === "" ? "—" : value);

/**
 * Fill the grade sheet from a spreadsheet saved as CSV. Shows what would
 * change first; "Apply" only fills the sheet, and nothing is saved until the
 * sheet's own Save button.
 */
function ImportScores({
  rows,
  split,
  onApply,
}: {
  rows: Row[];
  split: { ca: number; exam: number };
  onApply: (changes: ScoreChange[]) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const nameOf = new Map(rows.map((row) => [row.registrationId, row.name]));

  function reset() {
    setResult(null);
    if (input.current) input.current.value = "";
  }

  async function read(file: File | undefined) {
    setApplied(null);
    if (!file) return setResult(null);
    if (file.size > IMPORT_MAX_BYTES) {
      return setResult({ ok: false, message: "That file is too big for a class list." });
    }
    setResult(planScoreImport(await file.text(), rows, split));
  }

  function apply(changes: ScoreChange[]) {
    onApply(changes);
    setApplied(
      `${changes.length} student${changes.length === 1 ? "'s scores were" : "s' scores were"} filled in. Check them, then save the sheet.`,
    );
    reset();
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(
      new Blob([scoreTemplate(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "scores.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const plan = result?.ok ? result.plan : null;
  const skipped = plan
    ? [
        plan.unknown.length > 0 && `Not on this class list: ${plan.unknown.join(", ")}.`,
        plan.locked.length > 0 &&
          `Already submitted or published, so left as they are: ${plan.locked.join(", ")}.`,
        plan.duplicates.length > 0 &&
          `Listed more than once (only the first row was used): ${plan.duplicates.join(", ")}.`,
        ...plan.invalid.map(
          (row) => `Line ${row.line}${row.matric ? ` (${row.matric})` : ""}: ${row.message}.`,
        ),
      ].filter((line): line is string => Boolean(line))
    : [];

  return (
    <details className="rounded-xl border border-border bg-card p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-primary">
        Import scores from a spreadsheet
      </summary>
      <div className="mt-3 space-y-4 text-secondary">
        <p>
          Save your spreadsheet as CSV with a column each for the matric number, CA (out of{" "}
          {split.ca}) and exam (out of {split.exam}), headed <code>matric</code>, <code>ca</code>{" "}
          and <code>exam</code>. Other columns are ignored, and an empty cell keeps the score that
          is there.{" "}
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1 font-semibold text-accent-strong hover:underline"
          >
            <Download className="size-4" aria-hidden />
            Download this class as a CSV
          </button>
        </p>

        {applied && <FormMessage status="success" message={applied} />}

        <div>
          <label htmlFor={inputId} className="mb-1.5 block font-semibold text-primary">
            CSV file
          </label>
          <input
            ref={input}
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => read(event.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-brand file:bg-card file:px-3 file:py-2 file:font-semibold file:text-brand hover:file:bg-muted"
          />
        </div>

        <div aria-live="polite" className="space-y-3">
          {result && !result.ok && <FormMessage status="error" message={result.message} />}
          {plan && (
            <>
              <p className="font-semibold text-primary">
                <FileUp className="mr-1 inline size-4" aria-hidden />
                {plan.changes.length === 0
                  ? "Nothing in this file changes the sheet."
                  : `${plan.changes.length} student${plan.changes.length === 1 ? "" : "s"} would change.`}
                {plan.unchanged > 0 && ` ${plan.unchanged} already match.`}
              </p>
              {plan.changes.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {plan.changes.map((change) => (
                    <li key={change.registrationId} className="px-3 py-2">
                      <span className="block font-semibold text-primary">
                        {nameOf.get(change.registrationId) || change.matric}{" "}
                        <span className="font-normal text-secondary tabular-nums">
                          {change.matric}
                        </span>
                      </span>
                      <span className="block tabular-nums">
                        CA {dash(change.ca.from)} → <strong>{dash(change.ca.to)}</strong> · Exam{" "}
                        {dash(change.exam.from)} → <strong>{dash(change.exam.to)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {skipped.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-danger">
                  {skipped.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-3">
                {plan.changes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => apply(plan.changes)}
                    className="rounded-md bg-brand px-4 py-2.5 font-semibold text-on-brand hover:bg-brand-deep"
                  >
                    Fill in {plan.changes.length} student{plan.changes.length === 1 ? "" : "s"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md border border-border bg-card px-4 py-2.5 font-semibold text-primary hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </details>
  );
}

export default ImportScores;
