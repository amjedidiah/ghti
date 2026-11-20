import type { ReactNode } from "react";

/** Title band at the top of a public page. */
function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  /** Shown beside the title (e.g. the crest on the About page). */
  aside?: ReactNode;
}) {
  const heading = (
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-widest text-accent-strong uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {title}
      </h1>
      {children && (
        <div className="mt-4 max-w-2xl text-base leading-relaxed text-secondary">{children}</div>
      )}
    </div>
  );

  return (
    <div className="border-b border-border bg-muted">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {aside ? (
          <div className="flex items-center justify-between gap-6 sm:gap-10">
            {heading}
            <div className="shrink-0">{aside}</div>
          </div>
        ) : (
          heading
        )}
      </div>
    </div>
  );
}

export default PageHeader;
