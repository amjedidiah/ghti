import { ArrowRight } from "lucide-react";
import Link from "next/link";

import ProgrammeCard from "@/components/programmes/ProgrammeCard";
import Placeholder from "@/components/shared/Placeholder";
import { content } from "@/lib/content";
import { getPublishedProgrammes } from "@/lib/queries/programmes";
import { site } from "@/lib/site";

// Welcome text, vision and faith come from lib/content.ts (client input #9).
// Banner images are still to come.

async function HomePage() {
  const programmes = await getPublishedProgrammes();

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <p className="text-xs font-semibold tracking-widest text-accent-strong uppercase">
            A {site.ministry} institution
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">
            {site.fullName ?? `Welcome to ${site.name}`}
          </h1>
          <div aria-hidden className="mt-6 h-1 w-16 rounded-full bg-accent" />
          {content.welcome ? (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary">{content.welcome}</p>
          ) : (
            <Placeholder what="the welcome banner text." input={9} className="mt-6 max-w-2xl" />
          )}
          <p className="mt-4 max-w-2xl leading-relaxed text-secondary">
            Apply online, follow your studies and see your results, all in one place.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/academics"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-6 py-3 text-base font-semibold text-on-brand transition-colors hover:bg-brand-deep"
            >
              Explore programmes
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/admissions"
              className="inline-flex items-center justify-center rounded-md border border-brand px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-muted"
            >
              How to apply
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="faith-heading" className="border-b border-border">
        <h2 id="faith-heading" className="sr-only">
          Vision and faith
        </h2>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-2 lg:px-8">
          <Pillar title="Our vision" href="/about" linkLabel="About GHTI">
            {content.vision ? (
              <p className="font-display text-xl leading-snug text-primary">{content.vision}</p>
            ) : (
              <Placeholder what="the vision statement." input={9} />
            )}
          </Pillar>
          <Pillar title="What we believe" href="/statement-of-faith" linkLabel="Statement of Faith">
            {content.statementOfFaith ? (
              <p className="leading-relaxed text-secondary">
                {content.statementOfFaith.map((article) => article.title).join(" · ")}
              </p>
            ) : (
              <Placeholder what="the Statement of Faith." input={9} />
            )}
          </Pillar>
        </div>
      </section>

      {programmes.length > 0 && (
        <section aria-labelledby="programmes-heading" className="bg-muted">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2
                  id="programmes-heading"
                  className="font-display text-3xl font-bold tracking-tight text-primary"
                >
                  Our programmes
                </h2>
                <p className="mt-2 text-secondary">
                  Certificate, Ordinary Diploma and Post Graduate Diploma in Theology, taught in
                  person with recorded lectures and materials online.
                </p>
              </div>
              <Link
                href="/academics"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent-strong hover:underline"
              >
                All programmes
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programmes.slice(0, 3).map((programme) => (
                <li key={programme.slug}>
                  <ProgrammeCard programme={programme} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Dove gold, so the green header and green footer never stack. */}
      <section aria-labelledby="apply-heading" className="bg-accent-soft text-primary">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 id="apply-heading" className="font-display text-3xl font-bold tracking-tight">
              Ready to apply?
            </h2>
            <p className="mt-2 max-w-xl text-secondary">
              Create an account, fill in your application and upload your transcript, all from your
              phone.
            </p>
          </div>
          <Link
            href="/admissions"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-brand px-6 py-3 text-base font-semibold text-on-brand transition-colors hover:bg-brand-deep"
          >
            Start your application
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

function Pillar({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-xs font-semibold tracking-widest text-accent-strong uppercase">
        {title}
      </h3>
      <div className="mt-4 flex-1">{children}</div>
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong hover:underline"
      >
        {linkLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

export default HomePage;
