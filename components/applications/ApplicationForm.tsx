"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";

import AboutStep from "@/components/applications/steps/AboutStep";
import AddressesStep from "@/components/applications/steps/AddressesStep";
import ChurchStep from "@/components/applications/steps/ChurchStep";
import DocumentsStep, { type DocumentsByKind } from "@/components/applications/steps/DocumentsStep";
import EducationStep, { EMPTY_EDUCATION } from "@/components/applications/steps/EducationStep";
import ProgrammeStep, { type ProgrammeOption } from "@/components/applications/steps/ProgrammeStep";
import RefereesStep from "@/components/applications/steps/RefereesStep";
import ReviewStep from "@/components/applications/steps/ReviewStep";
import WorkStep from "@/components/applications/steps/WorkStep";
import FormMessage from "@/components/forms/FormMessage";
import Stepper from "@/components/forms/Stepper";
import SubmitButton from "@/components/forms/SubmitButton";
import { useUrlStep } from "@/components/forms/useUrlStep";
import type { ApplicationActionResult, RecordedDocument } from "@/lib/applications/actions";
import { APPLICATION_DOCUMENTS, type ApplicationDocumentKind } from "@/lib/applications/documents";
import {
  APPLICATION_STEPS,
  firstStepWithError,
  issuesForStep,
  parseStep,
  STEP_COUNT,
  stepOfField,
} from "@/lib/applications/steps";
import {
  applicationDraftSchema,
  applicationSubmitSchema,
  MISSING_FIELD_MESSAGES,
  type ApplicationValues,
} from "@/lib/validation/application";

const DOCUMENTS_STEP = APPLICATION_STEPS.findIndex((step) => step.id === "documents") + 1;
const DOCUMENT_KINDS = new Set<string>(APPLICATION_DOCUMENTS.map((slot) => slot.kind));

type Errors = Record<string, string>;
type Save = (values: ApplicationValues) => Promise<ApplicationActionResult>;

function errorsFrom(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Errors {
  const errors: Errors = {};
  for (const issue of issues) errors[issue.path.map(String).join(".")] ??= issue.message;
  return errors;
}

/**
 * The application form, in the steps of GHTI's paper form. One React Hook
 * Form holds every answer, so nothing is lost between steps. Next checks the
 * step's required answers; every move between steps saves the draft when it
 * has changed; `?step=` keeps the step in the URL (no personal data). Submit
 * checks everything and opens the first step with a problem.
 */
function ApplicationForm({
  applicationId,
  ownerId,
  initialValues,
  initialStep,
  initialDocuments,
  programmes,
  intakes,
  fee,
  save,
  submit,
}: {
  applicationId: string;
  ownerId: string;
  initialValues: ApplicationValues;
  initialStep: number;
  initialDocuments: DocumentsByKind;
  programmes: ProgrammeOption[];
  intakes: { id: string; label: string }[];
  /** The application fee and how to pay (site content), beside proof of payment. */
  fee: ReactNode;
  save: Save;
  submit: Save;
}) {
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationDraftSchema),
    defaultValues: {
      ...initialValues,
      education: initialValues.education.length ? initialValues.education : [EMPTY_EDUCATION],
    },
    mode: "onTouched",
  });
  const values = useWatch({ control: form.control }) as ApplicationValues;

  const [step, goTo] = useUrlStep(initialStep, parseStep);
  const [visited, setVisited] = useState(() => new Set([initialStep]));
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentErrors, setDocumentErrors] = useState<Errors>({});
  const [result, setResult] = useState<ApplicationActionResult | null>(null);
  const [saving, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const busy = saving || submitting;
  const isDirty = form.formState.isDirty;
  /** What to focus once the next step has rendered: its heading or a field. */
  const pendingFocus = useRef<string | null>(null);
  /** The step last shown: focus moves only on a change, never on first load. */
  const shownStep = useRef(initialStep);

  // A server error on a field goes as soon as its answer changes; an edit to
  // any education row or referee also clears the message for the whole list.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ name, type }) => {
          if (!name || type !== "change") return;
          const fields = [name as Path<ApplicationValues>];
          const list = name.split(".")[0];
          if (list === "education" || list === "referees") fields.push(list);
          for (const field of fields) {
            if (form.getFieldState(field).error?.type === "server") form.clearErrors(field);
          }
        },
      }),
    [form],
  );

  // Warn before leaving with unsaved answers.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // After a step change (buttons, the stepper or the browser's Back button):
  // remember the visit, move focus, and save anything the Back button skipped.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    setVisited((current) => (current.has(step) ? current : new Set(current).add(step)));
    const target = pendingFocus.current ?? "heading";
    pendingFocus.current = null;
    focus(target);
    if (form.formState.isDirty) startSaving(async () => void (await persist()));
    // persist and focus read the latest state when called; only the step matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function focus(target: string) {
    if (target === "heading") {
      const heading = document.getElementById(`${APPLICATION_STEPS[step - 1].id}-heading`);
      heading?.focus();
      heading?.scrollIntoView?.({ block: "start" });
    } else if (!DOCUMENT_KINDS.has(target)) {
      form.setFocus(target as Path<ApplicationValues>);
    }
  }

  /** Put errors on their fields (documents on their upload slots). */
  function applyErrors(errors: Errors) {
    const forDocuments: Errors = {};
    for (const [name, message] of Object.entries(errors)) {
      if (DOCUMENT_KINDS.has(name)) forDocuments[name] = message;
      else form.setError(name as Path<ApplicationValues>, { type: "server", message });
    }
    setDocumentErrors(forDocuments);
  }

  /** Open the first step with an error and focus its first problem. */
  function showErrors(errors: Errors) {
    applyErrors(errors);
    const first = firstStepWithError(errors);
    if (first === null) return;
    const field = Object.keys(errors).find((name) => stepOfField(name) === first) ?? "heading";
    if (first === step) focus(field);
    else {
      pendingFocus.current = field;
      goTo(first);
    }
  }

  function showResult(outcome: ApplicationActionResult) {
    setResult(outcome);
    // Answers that reached the database are no longer "unsaved".
    if (outcome.status === "saved" || outcome.savedAt) form.reset(form.getValues());
    if (outcome.status === "error" && outcome.fieldErrors) showErrors(outcome.fieldErrors);
  }

  /** Save the draft if anything changed. False when it could not be saved. */
  async function persist(): Promise<boolean> {
    if (!form.formState.isDirty) return true;
    const current = form.getValues();
    const draft = applicationDraftSchema.safeParse(current);
    if (!draft.success) {
      showErrors(errorsFrom(draft.error.issues));
      return false;
    }
    const outcome = await save(current);
    showResult(outcome);
    return outcome.status === "saved";
  }

  function moveTo(next: number) {
    if (next === step || busy) return;
    startSaving(async () => {
      if (await persist()) goTo(next);
    });
  }

  function onNext() {
    // Documents are checked by the server on submit; every other step must be complete.
    if (step !== DOCUMENTS_STEP) {
      const check = applicationSubmitSchema.safeParse(form.getValues());
      const errors = check.success ? {} : issuesForStep(check.error.issues, step);
      if (Object.keys(errors).length > 0) {
        applyErrors(errors);
        focus(Object.keys(errors)[0]);
        return;
      }
    }
    moveTo(step + 1);
  }

  function onSubmit() {
    form.clearErrors();
    setDocumentErrors({});
    const check = applicationSubmitSchema.safeParse(form.getValues());
    const errors = check.success ? {} : errorsFrom(check.error.issues);
    for (const slot of APPLICATION_DOCUMENTS) {
      if (slot.required && documents[slot.kind].length === 0) {
        errors[slot.kind] = MISSING_FIELD_MESSAGES[slot.kind].message;
      }
    }
    if (Object.keys(errors).length > 0) {
      setResult({
        status: "error",
        message: "Your application is not complete yet. Fix the highlighted answers, then submit.",
      });
      showErrors(errors);
      return;
    }
    // Redirects to /apply/status on success.
    startSubmitting(async () => showResult(await submit(form.getValues())));
  }

  function setDocumentsOf(kind: ApplicationDocumentKind, next: RecordedDocument[]) {
    setDocuments((current) => ({ ...current, [kind]: next }));
    if (next.length > 0) {
      setDocumentErrors((current) => {
        const rest = { ...current };
        delete rest[kind];
        return rest;
      });
    }
  }

  // A step is done once visited and its required answers are in.
  const check = applicationSubmitSchema.safeParse(values);
  const done = new Set(
    APPLICATION_STEPS.flatMap((_, index) => {
      const number = index + 1;
      if (!visited.has(number) || number === STEP_COUNT) return [];
      if (number === DOCUMENTS_STEP) {
        const complete = APPLICATION_DOCUMENTS.every(
          (slot) => !slot.required || documents[slot.kind].length > 0,
        );
        return complete ? [number] : [];
      }
      const issues = check.success ? {} : issuesForStep(check.error.issues, number);
      return Object.keys(issues).length === 0 ? [number] : [];
    }),
  );

  const savedAt = result?.savedAt;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (step === STEP_COUNT) onSubmit();
        else onNext();
      }}
      noValidate
      className="space-y-6"
    >
      <Stepper
        label="Application steps"
        steps={APPLICATION_STEPS}
        current={step}
        done={done}
        onSelect={moveTo}
      />

      {step === 1 && <ProgrammeStep form={form} programmes={programmes} intakes={intakes} />}
      {step === 2 && <AboutStep form={form} />}
      {step === 3 && <AddressesStep form={form} />}
      {step === 4 && <WorkStep form={form} />}
      {step === 5 && <ChurchStep form={form} />}
      {step === 6 && <EducationStep form={form} />}
      {step === 7 && <RefereesStep form={form} />}
      {step === DOCUMENTS_STEP && (
        <DocumentsStep
          applicationId={applicationId}
          ownerId={ownerId}
          documents={documents}
          onChange={setDocumentsOf}
          errors={documentErrors}
          fee={fee}
        />
      )}
      {step === STEP_COUNT && (
        <ReviewStep
          form={form}
          values={values}
          programmes={programmes}
          intakes={intakes}
          documents={documents}
          onEdit={moveTo}
        />
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {result?.status === "error" && (
          <div className="mb-4">
            <FormMessage status="error" message={result.message} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p role="status" className="text-center text-xs text-secondary sm:text-left sm:text-sm">
            {saving
              ? "Saving…"
              : savedAt && !isDirty
                ? `Draft saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
                : isDirty
                  ? "You have unsaved changes."
                  : "Your answers are saved as a draft until you submit."}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
            <button
              type="button"
              onClick={() => moveTo(step - 1)}
              disabled={busy || step === 1}
              className="inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-3 text-base font-semibold text-primary hover:bg-muted disabled:opacity-50 sm:px-5"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => startSaving(async () => void (await persist()))}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md border border-brand bg-card px-3 py-3 text-base font-semibold text-brand hover:bg-muted disabled:opacity-60 sm:px-5"
            >
              Save<span className="hidden sm:inline">&nbsp;draft</span>
            </button>
            {step < STEP_COUNT ? (
              <SubmitButton pending={saving} className="px-3 sm:w-auto sm:px-5">
                Next
              </SubmitButton>
            ) : (
              <SubmitButton pending={submitting} className="px-3 sm:w-auto sm:px-5">
                Submit<span className="hidden sm:inline">&nbsp;application</span>
              </SubmitButton>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

export default ApplicationForm;
