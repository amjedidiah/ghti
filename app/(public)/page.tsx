import { ArrowRight } from "lucide-react";
import Link from "next/link";

import ProgrammeCard from "@/components/programmes/ProgrammeCard";
import { getPublishedProgrammes } from "@/lib/queries/programmes";
import { site } from "@/lib/site";

// Welcome banner copy is a placeholder. The client's banner text and images,
// vision, history and Statement of Faith replace it in step 1.5.

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
            Welcome to {site.name}
          </h1>
          <div aria-hidden className="mt-6 h-1 w-16 rounded-full bg-accent" />
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-secondary">
            {site.description}
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
                  Certificate, Diploma and Degree, taught in person with recorded lectures and
                  materials online.
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

      <section aria-labelledby="apply-heading" className="bg-brand text-on-brand">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 id="apply-heading" className="font-display text-3xl font-bold tracking-tight">
              Ready to apply?
            </h2>
            <p className="mt-2 max-w-xl text-on-brand-muted">
              Create an account, fill in your application and upload your transcript, all from your
              phone.
            </p>
          </div>
          <Link
            href="/admissions"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-semibold text-on-accent transition-colors hover:bg-accent-soft"
          >
            Start your application
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}

export default HomePage;
