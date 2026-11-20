import type { Metadata } from "next";

import PageHeader from "@/components/shared/PageHeader";
import Placeholder from "@/components/shared/Placeholder";
import { getSiteContent } from "@/lib/queries/site-content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Statement of Faith",
  description: `What ${site.name} believes.`,
};

async function StatementOfFaithPage() {
  const content = await getSiteContent();
  const articles = content.statementOfFaith;

  return (
    <>
      <PageHeader eyebrow="Faith" title="Statement of Faith">
        <p>The beliefs that shape our teaching and our life together.</p>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {articles ? (
          <ol className="space-y-8">
            {articles.map((article, index) => (
              <li key={article.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-1 font-display text-2xl font-bold text-accent-strong lining-nums"
                >
                  {index + 1}.
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-primary">{article.title}</h2>
                  <p className="mt-2 leading-relaxed text-secondary">{article.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Placeholder what="the GHTI Statement of Faith." input={9} />
        )}
      </div>
    </>
  );
}

export default StatementOfFaithPage;
