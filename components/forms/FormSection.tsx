import type { ReactNode } from "react";

/** A numbered section of a long form, e.g. "2. Personal details". */
function FormSection({
  id,
  step,
  title,
  description,
  children,
}: {
  id: string;
  step: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8"
    >
      <h2
        id={`${id}-heading`}
        className="flex items-baseline gap-3 font-display text-xl font-bold text-primary sm:text-2xl"
      >
        <span
          aria-hidden
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand font-sans text-sm font-semibold text-on-brand"
        >
          {step}
        </span>
        {title}
      </h2>
      {description && (
        <div className="mt-2 text-sm leading-relaxed text-secondary">{description}</div>
      )}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export default FormSection;
