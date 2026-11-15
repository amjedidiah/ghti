import type { ReactNode } from "react";

/** Centred card for sign-in, registration and password pages. */
function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex-1 bg-muted px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {title}
          </h1>
          {description && (
            <div className="mt-2 text-sm leading-relaxed text-secondary">{description}</div>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-secondary">{footer}</div>}
      </div>
    </div>
  );
}

export default AuthCard;
