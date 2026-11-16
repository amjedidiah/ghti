import type { z } from "zod";

import type { FormState } from "@/lib/validation/auth";

/**
 * Parse a submitted form with a Zod schema. On failure, returns a FormState
 * with the first-level field errors, ready to hand back to `useActionForm`.
 */
export function parseFormData<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.infer<S> } | { ok: false; state: FormState } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    ok: false,
    state: { status: "error", message: "Please fix the highlighted fields.", fieldErrors },
  };
}
