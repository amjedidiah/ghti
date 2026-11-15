import { ArrowRight, ChevronRight, Clock, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import LevelBadge from "@/components/programmes/LevelBadge";
import { LEVEL_LABELS, toParagraphs } from "@/lib/programmes";
import { getPublishedProgramme } from "@/lib/queries/programmes";

export async function generateMetadata({
  params,
}: PageProps<"/academics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const programme = await getPublishedProgramme(slug);
  if (!programme) return { title: "Programme not found" };
  return {
    title: programme.title,
    description: programme.description.slice(0, 160) || undefined,
  };
}

function ProgrammePage({ params }: PageProps<"/academics/[slug]">) {
  return (
    <Suspense fallback={<ProgrammeSkeleton />}>
      <ProgrammeDetail params={params} />
    </Suspense>
  );
}

async function ProgrammeDetail({ params }: Pick<PageProps<"/academics/[slug]">, "params">) {
  const { slug } = await params;
  const programme = await getPublishedProgramme(slug);
  if (!programme) notFound();

  const about = toParagraphs(programme.description);
  const requirements = toParagraphs(programme.requirements);

  return (
    <>
      <div className="border-b border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-sm text-secondary">
              <li>
                <Link href="/academics" className="hover:text-primary hover:underline">
                  Academics
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="size-4" />
              </li>
              <li aria-current="page" className="truncate text-primary">
                {programme.title}
              </li>
            </ol>
          </nav>
          <LevelBadge level={programme.level} className="mt-6" />
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {programme.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-10 lg:col-span-2">
          {about.length > 0 && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="font-display text-2xl font-bold text-primary">
                About this programme
              </h2>
              <div className="mt-4 space-y-4 leading-relaxed text-secondary">
                {about.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          {requirements.length > 0 && (
            <section aria-labelledby="requirements-heading">
              <h2
                id="requirements-heading"
                className="font-display text-2xl font-bold text-primary"
              >
                Entry requirements
              </h2>
              <div className="mt-4 space-y-4 leading-relaxed text-secondary">
                {requirements.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-6">
            <dl className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <GraduationCap className="mt-0.5 size-5 shrink-0 text-accent-strong" aria-hidden />
                <div>
                  <dt className="font-semibold text-primary">Level</dt>
                  <dd className="text-secondary">{LEVEL_LABELS[programme.level].singular}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-accent-strong" aria-hidden />
                <div>
                  <dt className="font-semibold text-primary">Duration</dt>
                  <dd className="text-secondary">{programme.duration}</dd>
                </div>
              </div>
            </dl>
            <Link
              href="/admissions"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 text-base font-semibold text-on-brand transition-colors hover:bg-brand-deep"
            >
              How to apply
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function ProgrammeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading programme">
      <div className="border-b border-border bg-muted">
        <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="h-4 w-40 rounded bg-border" />
          <div className="mt-6 h-5 w-20 rounded-full bg-border" />
          <div className="mt-4 h-9 w-full max-w-md rounded bg-border" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl animate-pulse space-y-3 px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-4 w-full max-w-2xl rounded bg-border" />
        <div className="h-4 w-full max-w-xl rounded bg-border" />
        <div className="h-4 w-full max-w-lg rounded bg-border" />
      </div>
    </div>
  );
}

export default ProgrammePage;
