import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";

import ProgrammeStatusBadge from "@/components/admin/ProgrammeStatusBadge";
import LevelBadge from "@/components/programmes/LevelBadge";
import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { listProgrammesForAdmin, listTermsForAdmin } from "@/lib/queries/admin-academics";

export const metadata: Metadata = { title: "Academics", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

function AcademicsPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Academics">
        <p>
          Programmes, their courses, and the terms they run in. Published programmes show on the
          website; terms open for applications show on the application form.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading academics…</p>}>
          <AcademicsContent />
        </Suspense>
      </div>
    </>
  );
}

async function AcademicsContent() {
  await requireRole("admin");
  const [programmes, terms] = await Promise.all([listProgrammesForAdmin(), listTermsForAdmin()]);

  return (
    <>
      <Section
        id="programmes-heading"
        title="Programmes"
        action={{ href: "/admin/academics/programmes/new", label: "New programme" }}
      >
        {programmes.length === 0 ? (
          <Empty>No programmes yet.</Empty>
        ) : (
          <List>
            {programmes.map((programme) => (
              <Row key={programme.id} href={`/admin/academics/programmes/${programme.id}`}>
                <span className="min-w-0">
                  <span className="block font-semibold text-primary">{programme.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-secondary">
                    <LevelBadge level={programme.level} />
                    <ProgrammeStatusBadge status={programme.status} />
                    <span className="tabular-nums">
                      {programme.courseCount} course{programme.courseCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
              </Row>
            ))}
          </List>
        )}
      </Section>

      <Section
        id="terms-heading"
        title="Terms"
        action={{ href: "/admin/academics/terms/new", label: "New term" }}
      >
        {terms.length === 0 ? (
          <Empty>No terms yet. Add one before opening applications.</Empty>
        ) : (
          <List>
            {terms.map((term) => (
              <Row key={term.id} href={`/admin/academics/terms/${term.id}`}>
                <span className="min-w-0">
                  <span className="block font-semibold text-primary">
                    {term.name}, {term.session}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
                    <span>
                      {term.starts_on && term.ends_on
                        ? `${dateFormat.format(new Date(term.starts_on))} to ${dateFormat.format(new Date(term.ends_on))}`
                        : "Dates not set"}
                    </span>
                    {term.accepting_applications && (
                      <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-success/30 ring-inset">
                        Open for applications
                      </span>
                    )}
                  </span>
                </span>
              </Row>
            ))}
          </List>
        )}
      </Section>
    </>
  );
}

function Section({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-primary">
          {title}
        </h2>
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-deep"
        >
          <Plus className="size-4" aria-hidden />
          {action.label}
        </Link>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {children}
    </ul>
  );
}

function Row({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted sm:px-5"
      >
        {children}
        <ChevronRight className="size-5 shrink-0 text-secondary" aria-hidden />
      </Link>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
      {children}
    </p>
  );
}

export default AcademicsPage;
