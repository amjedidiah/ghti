import type { ReactNode } from "react";

/** id of a field's error message, for aria-describedby. */
export function errorId(fieldId: string) {
  return `${fieldId}-error`;
}

/** id of a field's hint text, for aria-describedby. */
export function hintId(fieldId: string) {
  return `${fieldId}-hint`;
}

/** aria-describedby value for a field with an optional hint and error. */
export function describedBy(fieldId: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  return (
    [hint ? hintId(fieldId) : null, error ? errorId(fieldId) : null].filter(Boolean).join(" ") ||
    undefined
  );
}

/** Label, optional hint, the control, and its error message (pattern from cwl FormFields). */
function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  /** Layout classes for the wrapper (e.g. grid spans). */
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-primary">
        {label}
      </label>
      {hint && (
        <p id={hintId(id)} className="mt-1 text-sm text-secondary">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={errorId(id)} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
