import type { Metadata } from "next";

import ProgrammeCard from "@/components/programmes/ProgrammeCard";
import PageHeader from "@/components/shared/PageHeader";
import { groupProgrammesByLevel, LEVEL_LABELS } from "@/lib/programmes";
import { getPublishedProgrammes } from "@/lib/queries/programmes";

export const metadata: Metadata = {
  title: "Academics",
  description: "Certificate, Ordinary Diploma and Post Graduate Diploma in Theology at GHTI.",
};

async function AcademicsPage() {
  const groups = groupProgrammesByLevel(await getPublishedProgrammes());

  return (
    <>
      <PageHeader eyebrow="Academics" title="Our programmes">
        <p>
          Choose the level that fits where you are: a Certificate to build foundations, an Ordinary
          Diploma to go deeper, or a Post Graduate Diploma if you already hold a degree.
        </p>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-secondary">
            Programmes will be listed here soon.
          </p>
        ) : (
          groups.map(({ level, programmes }) => (
            <section key={level} aria-labelledby={`level-${level}`}>
              <h2
                id={`level-${level}`}
                className="font-display text-2xl font-bold tracking-tight text-primary"
              >
                {LEVEL_LABELS[level].plural}
              </h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {programmes.map((programme) => (
                  <li key={programme.slug}>
                    <ProgrammeCard programme={programme} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}

export default AcademicsPage;
