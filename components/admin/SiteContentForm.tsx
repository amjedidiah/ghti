"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useId, useState } from "react";

import Field, { describedBy } from "@/components/forms/Field";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import Textarea from "@/components/forms/Textarea";
import TextInput from "@/components/forms/TextInput";
import type { FaithArticle } from "@/lib/site-content";
import { initialFormState, type FormState } from "@/lib/validation/auth";

type Kind = "text" | "line" | "email" | "phone" | "paragraphs" | "articles";

/**
 * Edit one piece of GHTI's public text. Saving an empty answer clears it, and
 * the public page shows its "Waiting for GHTI" placeholder again. Inputs are
 * controlled, so what was saved stays on screen after the action.
 */
function SiteContentForm({
  action,
  label,
  hint,
  kind,
  max,
  initialText,
  initialArticles,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  hint: string;
  kind: Kind;
  max: number;
  initialText: string;
  initialArticles: FaithArticle[];
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const id = useId();
  const [text, setText] = useState(initialText);
  const error = state.fieldErrors?.value?.[0];

  return (
    <form action={formAction} className="space-y-4">
      {kind === "articles" ? (
        <ArticlesEditor label={label} hint={hint} initial={initialArticles} />
      ) : (
        <Field id={id} label={label} hint={hint} error={error}>
          {kind === "text" || kind === "paragraphs" ? (
            <Textarea
              id={id}
              name="value"
              rows={kind === "paragraphs" ? 8 : 3}
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy(id, { hint, error })}
            />
          ) : (
            <TextInput
              id={id}
              name="value"
              type={kind === "email" ? "email" : kind === "phone" ? "tel" : "text"}
              maxLength={max}
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy(id, { hint, error })}
            />
          )}
        </Field>
      )}
      {state.message && state.status !== "idle" && !error && (
        <FormMessage status={state.status} message={state.message} />
      )}
      <SubmitButton className="sm:w-auto">Save</SubmitButton>
    </form>
  );
}

/** The Statement of Faith: articles with a title and text, in order. */
function ArticlesEditor({
  label,
  hint,
  initial,
}: {
  label: string;
  hint: string;
  initial: FaithArticle[];
}) {
  const baseId = useId();
  // Keys stay stable while articles move or go.
  const [articles, setArticles] = useState(() =>
    (initial.length > 0 ? initial : [{ title: "", body: "" }]).map((article, index) => ({
      ...article,
      key: index,
    })),
  );
  const [nextKey, setNextKey] = useState(articles.length);

  function update(index: number, part: "title" | "body", value: string) {
    setArticles((current) =>
      current.map((article, i) => (i === index ? { ...article, [part]: value } : article)),
    );
  }
  function move(index: number, by: -1 | 1) {
    setArticles((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-primary">{label}</legend>
      <p className="-mt-2 text-sm text-secondary">{hint}</p>
      <ol className="space-y-4">
        {articles.map((article, index) => {
          const id = `${baseId}-${article.key}`;
          return (
            <li key={article.key} className="rounded-md border border-border p-4">
              <div className="space-y-3">
                <Field id={`${id}-title`} label={`Article ${index + 1}: title`}>
                  <TextInput
                    id={`${id}-title`}
                    name="title"
                    maxLength={200}
                    value={article.title}
                    onChange={(event) => update(index, "title", event.target.value)}
                  />
                </Field>
                <Field id={`${id}-body`} label={`Article ${index + 1}: text`}>
                  <Textarea
                    id={`${id}-body`}
                    name="body"
                    rows={4}
                    value={article.body}
                    onChange={(event) => update(index, "body", event.target.value)}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <IconButton
                    label={`Move article ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Move article ${index + 1} down`}
                    disabled={index === articles.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Remove article ${index + 1}`}
                    onClick={() => setArticles((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => {
          setArticles((current) => [...current, { title: "", body: "", key: nextKey }]);
          setNextKey((key) => key + 1);
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
      >
        <Plus className="size-4" aria-hidden />
        Add an article
      </button>
    </fieldset>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-md border border-border text-secondary hover:bg-muted hover:text-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default SiteContentForm;
