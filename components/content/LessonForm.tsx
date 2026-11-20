"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";
import { useWatch } from "react-hook-form";

import LessonPlayer from "@/components/content/LessonPlayer";
import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import TextInput from "@/components/forms/TextInput";
import { useActionForm } from "@/components/forms/useActionForm";
import { parseYouTubeId } from "@/lib/links";
import type { FormState } from "@/lib/validation/auth";
import { lessonSchema, type LessonValues } from "@/lib/validation/content";

const EMPTY: LessonValues = { title: "", body: "", youtubeLink: "" };

/**
 * Add or edit a lesson. A pasted YouTube link previews straight away, so the
 * lecturer can check it is the right (and an unlisted, playable) video.
 */
function LessonForm({
  action,
  initial,
  submitLabel,
  onSaved,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: LessonValues;
  submitLabel: string;
  /** Called after a successful save (e.g. to close an edit form). */
  onSaved?: () => void;
}) {
  const uid = useId();
  const ids = { title: `${uid}-title`, body: `${uid}-body`, youtubeLink: `${uid}-video` };
  const { form, state, pending, formAction, onSubmit } = useActionForm({
    resolver: zodResolver(lessonSchema),
    action,
    defaultValues: initial ?? EMPTY,
  });
  const { errors } = form.formState;
  const link = useWatch({ control: form.control, name: "youtubeLink" });
  const title = useWatch({ control: form.control, name: "title" });
  const previewId = typeof link === "string" ? parseYouTubeId(link) : null;

  useEffect(() => {
    if (state.status !== "success") return;
    if (!initial) form.reset(EMPTY);
    onSaved?.();
  }, [state, form, initial, onSaved]);

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="space-y-4">
      {state.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <Field id={ids.title} label="Title" error={errors.title?.message}>
        <TextInput
          id={ids.title}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy(ids.title, { error: errors.title })}
          {...form.register("title")}
        />
      </Field>
      <Field
        id={ids.youtubeLink}
        label="YouTube video (optional)"
        hint="The video's link, from Share → Copy. Upload it as Unlisted."
        error={errors.youtubeLink?.message}
      >
        <TextInput
          id={ids.youtubeLink}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://youtu.be/…"
          aria-invalid={Boolean(errors.youtubeLink)}
          aria-describedby={describedBy(ids.youtubeLink, { hint: true, error: errors.youtubeLink })}
          {...form.register("youtubeLink")}
        />
      </Field>
      {previewId && <LessonPlayer youtubeId={previewId} title={title || "Preview"} />}
      <Field
        id={ids.body}
        label="Notes (optional)"
        hint="What to read or do for this lesson."
        error={errors.body?.message}
      >
        <Textarea
          id={ids.body}
          rows={4}
          maxLength={5000}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy(ids.body, { hint: true, error: errors.body })}
          {...form.register("body")}
        />
      </Field>
      <SubmitButton pending={pending} className="sm:w-auto">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export default LessonForm;
