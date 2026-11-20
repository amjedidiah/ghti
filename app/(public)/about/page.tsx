import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PageHeader from "@/components/shared/PageHeader";
import Placeholder from "@/components/shared/Placeholder";
import { content } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name}: our mission and history.`,
};

function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={`About ${site.name}`}
        aside={
          <Image
            src="/brand/ghti-crest.svg"
            alt="The GHTI crest: a dove descending on an open Bible, with the name Great Harvest Theological Institute"
            width={400}
            height={480}
            preload
            className="h-auto w-28 sm:w-36 lg:w-44"
          />
        }
      >
        <p>{site.fullName ?? `A ${site.ministry} institution.`}</p>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        <Section title="Our mission">
          {content.mission ? (
            <p className="font-display text-2xl leading-snug text-primary">{content.mission}</p>
          ) : (
            <Placeholder what="the mission statement." input={9} />
          )}
        </Section>

        <Section title="Our history">
          {content.history ? (
            <div className="space-y-4 leading-relaxed text-secondary">
              {content.history.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <Placeholder what="the history of GHTI." input={9} />
          )}
        </Section>

        <p className="border-t border-border pt-8 text-secondary">
          Read our{" "}
          <Link
            href="/statement-of-faith"
            className="font-semibold text-accent-strong hover:underline"
          >
            Statement of Faith
          </Link>
          , or see our{" "}
          <Link href="/academics" className="font-semibold text-accent-strong hover:underline">
            programmes
          </Link>
          .
        </p>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-primary">{title}</h2>
      <div aria-hidden className="mt-3 h-1 w-12 rounded-full bg-accent" />
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default AboutPage;
