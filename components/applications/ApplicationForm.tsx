"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition, type HTMLInputTypeAttribute } from "react";
import { get, useFieldArray, useForm, type Path, type UseFormReturn } from "react-hook-form";

import DocumentUpload from "@/components/applications/DocumentUpload";
import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import FormSection from "@/components/forms/FormSection";
import Select from "@/components/forms/Select";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import TextInput from "@/components/forms/TextInput";
import {
  saveApplication,
  submitApplication,
  type ApplicationActionResult,
  type RecordedDocument,
} from "@/lib/applications/actions";
import { LEVEL_LABELS, PROGRAMME_LEVELS, type ProgrammeLevel } from "@/lib/programmes";
import {
  applicationDraftSchema,
  applicationSubmitSchema,
  MAX_EDUCATION_ENTRIES,
  NIGERIAN_STATES,
  type ApplicationValues,
} from "@/lib/validation/application";

type Form = UseFormReturn<ApplicationValues>;
type DocKind = "transcript" | "id_card" | "photo";

/** Which documents to ask for. Required/optional to confirm with GHTI (client input #5). */
const DOCUMENTS: { kind: DocKind; label: string; hint: string; required: boolean }[] = [
  {
    kind: "transcript",
    label: "Transcript or result",
    hint: "Your most recent transcript, certificate or WAEC/NECO result. A clear phone photo is fine.",
    required: true,
  },
  {
    kind: "id_card",
    label: "Means of identification",
    hint: "National ID (NIN slip), international passport, driver's licence or voter's card.",
    required: false,
  },
  {
    kind: "photo",
    label: "Passport photograph",
    hint: "A recent photo of your face against a plain background.",
    required: false,
  },
];

const EMPTY_EDUCATION = { institution: "", qualification: "", year: "" };

function ApplicationForm({
  applicationId,
  ownerId,
  initialValues,
  programmes,
  intakes,
  documents,
}: {
  applicationId: string;
  ownerId: string;
  initialValues: ApplicationValues;
  programmes: { id: string; title: string; level: ProgrammeLevel }[];
  intakes: { id: string; label: string }[];
  documents: Record<DocKind, RecordedDocument | null>;
}) {
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationDraftSchema),
    defaultValues: {
      ...initialValues,
      education: initialValues.education.length ? initialValues.education : [EMPTY_EDUCATION],
    },
    mode: "onTouched",
  });
  const education = useFieldArray({ control: form.control, name: "education" });

  const [result, setResult] = useState<ApplicationActionResult | null>(null);
  const [transcriptError, setTranscriptError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const busy = saving || submitting;
  const savedAt = result?.savedAt;

  // Warn before leaving with unsaved answers.
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function showResult(outcome: ApplicationActionResult) {
    setResult(outcome);
    // Answers that reached the database are no longer "unsaved".
    if (outcome.status === "saved" || outcome.savedAt) form.reset(form.getValues());
    if (outcome.status === "saved") return;
    const fieldErrors = outcome.fieldErrors ?? {};
    setTranscriptError(fieldErrors.transcript);
    let focused = false;
    for (const [name, message] of Object.entries(fieldErrors)) {
      if (name === "transcript") continue;
      form.setError(name as Path<ApplicationValues>, { type: "server", message });
      if (!focused) {
        form.setFocus(name as Path<ApplicationValues>);
        focused = true;
      }
    }
  }

  const onSave = form.handleSubmit((values) => {
    startSaving(async () => showResult(await saveApplication(applicationId, values)));
  });

  function onSubmit() {
    form.clearErrors();
    const values = form.getValues();
    const check = applicationSubmitSchema.safeParse(values);
    if (!check.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of check.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return showResult({
        status: "error",
        message: "Your application is not complete yet. Fix the highlighted answers, then submit.",
        fieldErrors,
      });
    }
    startSubmitting(async () => {
      // Redirects to /apply/status on success.
      showResult(await submitApplication(applicationId, values));
    });
  }

  const byLevel = PROGRAMME_LEVELS.map((level) => ({
    level,
    items: programmes.filter((programme) => programme.level === level),
  })).filter((group) => group.items.length > 0);

  return (
    <form onSubmit={onSave} noValidate className="space-y-6">
      <FormSection id="programme" step={1} title="Programme">
        <SelectField form={form} name="programmeId" label="Programme">
          <option value="">Choose a programme</option>
          {byLevel.map(({ level, items }) => (
            <optgroup key={level} label={LEVEL_LABELS[level].plural}>
              {items.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.title}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>

        {intakes.length > 0 ? (
          <SelectField
            form={form}
            name="intakeTermId"
            label="Intake"
            hint="When you would like to start."
          >
            <option value="">Choose an intake</option>
            {intakes.map((intake) => (
              <option key={intake.id} value={intake.id}>
                {intake.label}
              </option>
            ))}
          </SelectField>
        ) : (
          <FormMessage
            status="error"
            message="Applications are not open right now. You can fill in and save your answers, and submit when the next intake opens."
          />
        )}
      </FormSection>

      <FormSection
        id="personal"
        step={2}
        title="Personal details"
        description="As they appear on your official documents."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField form={form} name="surname" label="Surname" autoComplete="family-name" />
          <TextField form={form} name="firstName" label="First name" autoComplete="given-name" />
        </div>
        <TextField
          form={form}
          name="otherNames"
          label="Other names (optional)"
          autoComplete="additional-name"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            form={form}
            name="dateOfBirth"
            label="Date of birth"
            type="date"
            autoComplete="bday"
          />
          <GenderField form={form} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            form={form}
            name="phone"
            label="Phone number"
            type="tel"
            autoComplete="tel"
            hint="Nigerian numbers can start with 0 or +234."
          />
          <TextField
            form={form}
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
          />
        </div>
        <TextAreaField
          form={form}
          name="address"
          label="Home address"
          autoComplete="street-address"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField form={form} name="stateOfOrigin" label="State of origin">
            <option value="">Choose a state</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </SelectField>
          <TextField
            form={form}
            name="nationality"
            label="Nationality"
            autoComplete="country-name"
          />
        </div>
        <TextField
          form={form}
          name="crmBranch"
          label="CRM branch or church (optional)"
          hint="The branch or church you attend."
        />
      </FormSection>

      <FormSection
        id="education"
        step={3}
        title="Education"
        description="Your schools and qualifications, most recent first."
      >
        {education.fields.map((entry, index) => (
          <fieldset key={entry.id} className="rounded-md border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-primary">
              School or qualification {index + 1}
            </legend>
            <div className="space-y-4">
              <TextField
                form={form}
                name={`education.${index}.institution`}
                label="School or institution"
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <TextField
                  form={form}
                  name={`education.${index}.qualification`}
                  label="Qualification"
                  hint="e.g. WASSCE, OND, B.Sc."
                />
                <TextField
                  form={form}
                  name={`education.${index}.year`}
                  label="Year"
                  inputMode="numeric"
                />
              </div>
              {education.fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => education.remove(index)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:underline"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remove this entry
                </button>
              )}
            </div>
          </fieldset>
        ))}
        {errorFor(form, "education") && (
          <p className="text-sm font-medium text-danger">{errorFor(form, "education")}</p>
        )}
        {education.fields.length < MAX_EDUCATION_ENTRIES && (
          <button
            type="button"
            onClick={() => education.append(EMPTY_EDUCATION)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
          >
            <Plus className="size-4" aria-hidden />
            Add another
          </button>
        )}
      </FormSection>

      <FormSection id="contacts" step={4} title="Next of kin and referee">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField form={form} name="nextOfKinName" label="Next of kin's full name" />
          <TextField
            form={form}
            name="nextOfKinRelationship"
            label="Relationship to you"
            hint="e.g. Mother, Husband, Brother."
          />
        </div>
        <TextField
          form={form}
          name="nextOfKinPhone"
          label="Next of kin's phone number"
          type="tel"
        />

        <p className="border-t border-border pt-5 text-sm text-secondary">
          A referee who knows you well, such as your pastor or branch leader (optional).
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField form={form} name="refereeName" label="Referee's full name" />
          <TextField
            form={form}
            name="refereePosition"
            label="Their position"
            hint="e.g. Pastor, CRM Lekki branch."
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField form={form} name="refereePhone" label="Referee's phone number" type="tel" />
          <TextField form={form} name="refereeEmail" label="Referee's email" type="email" />
        </div>
      </FormSection>

      <FormSection
        id="documents"
        step={5}
        title="Documents"
        description="Files upload as soon as you choose them. On a phone you can take a photo instead."
      >
        {DOCUMENTS.map((doc) => (
          <DocumentUpload
            key={doc.kind}
            applicationId={applicationId}
            ownerId={ownerId}
            kind={doc.kind}
            label={doc.label}
            hint={doc.hint}
            required={doc.required}
            initial={documents[doc.kind]}
            error={doc.kind === "transcript" ? transcriptError : undefined}
          />
        ))}
      </FormSection>

      <FormSection id="declaration" step={6} title="Declaration">
        <ConsentField form={form} />
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {result?.status === "error" && (
          <div className="mb-4">
            <FormMessage status="error" message={result.message} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p role="status" className="text-center text-xs text-secondary sm:text-left sm:text-sm">
            {savedAt && !isDirty
              ? `Draft saved at ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
              : isDirty
                ? "You have unsaved changes."
                : "Your answers are saved as a draft until you submit."}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-md border border-brand bg-card px-4 py-3 text-base font-semibold text-brand hover:bg-muted disabled:opacity-60 sm:px-5"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <SubmitButton
              type="button"
              onClick={onSubmit}
              pending={submitting}
              className="px-4 sm:w-auto sm:px-5"
            >
              Submit<span className="hidden sm:inline">&nbsp;application</span>
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}

// Field helpers ------------------------------------------------------------------

function errorFor(form: Form, name: Path<ApplicationValues>): string | undefined {
  const error = get(form.formState.errors, name) as { message?: string } | undefined;
  return error?.message;
}

function TextField({
  form,
  name,
  label,
  hint,
  type = "text",
  autoComplete,
  inputMode,
}: {
  form: Form;
  name: Path<ApplicationValues>;
  label: string;
  hint?: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
}) {
  const id = `field-${name.replaceAll(".", "-")}`;
  const error = errorFor(form, name);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <TextInput
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, { hint, error })}
        {...form.register(name)}
      />
    </Field>
  );
}

function TextAreaField({
  form,
  name,
  label,
  autoComplete,
}: {
  form: Form;
  name: Path<ApplicationValues>;
  label: string;
  autoComplete?: string;
}) {
  const id = `field-${name}`;
  const error = errorFor(form, name);
  return (
    <Field id={id} label={label} error={error}>
      <Textarea
        id={id}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, { error })}
        {...form.register(name)}
      />
    </Field>
  );
}

function SelectField({
  form,
  name,
  label,
  hint,
  children,
}: {
  form: Form;
  name: Path<ApplicationValues>;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const id = `field-${name}`;
  const error = errorFor(form, name);
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, { hint, error })}
        {...form.register(name)}
      >
        {children}
      </Select>
    </Field>
  );
}

function GenderField({ form }: { form: Form }) {
  const error = errorFor(form, "gender");
  return (
    <fieldset aria-describedby={error ? "field-gender-error" : undefined}>
      <legend className="block text-sm font-semibold text-primary">Gender</legend>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        {(["female", "male"] as const).map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3.5 py-3 text-base text-primary has-checked:border-brand has-checked:bg-brand/5"
          >
            <input
              type="radio"
              value={value}
              className="size-4 accent-(--brand)"
              {...form.register("gender")}
            />
            {value === "female" ? "Female" : "Male"}
          </label>
        ))}
      </div>
      {error && (
        <p id="field-gender-error" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function ConsentField({ form }: { form: Form }) {
  const error = errorFor(form, "consent");
  return (
    <div>
      <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-primary">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-(--brand)"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "field-consent-error" : undefined}
          {...form.register("consent")}
        />
        <span>
          The information I have given is true and complete. I agree that GHTI may store and use it,
          and the documents I upload, to consider my application for admission, as described in the{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-strong underline"
          >
            privacy notice
          </a>
          .
        </span>
      </label>
      {error && (
        <p id="field-consent-error" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default ApplicationForm;
