import type { Metadata } from "next";
import { Suspense } from "react";

import SiteContentForm from "@/components/admin/SiteContentForm";
import PageHeader from "@/components/shared/PageHeader";
import { updateSiteContent } from "@/lib/admin/site-content";
import { requireRole } from "@/lib/auth/session";
import { getSiteContentForAdmin } from "@/lib/queries/site-content";
import {
  SITE_CONTENT_FIELDS,
  SITE_CONTENT_GROUPS,
  SITE_CONTENT_NAMES,
  toEditText,
  type FaithArticle,
} from "@/lib/site-content";

export const metadata: Metadata = { title: "Site content", robots: { index: false } };

const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

/** GHTI's public text: welcome, mission, history, Statement of Faith, contacts, privacy, fee. */
function SiteContentPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Site content">
        <p>
          The words on the public pages. Saving shows the change straight away. Leave a box empty
          and save to show &ldquo;Waiting for GHTI&rdquo; there instead.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading the site text…</p>}>
          <SiteContentForms />
        </Suspense>
      </div>
    </>
  );
}

async function SiteContentForms() {
  await requireRole("admin");
  const { content, changed } = await getSiteContentForAdmin();

  return SITE_CONTENT_GROUPS.map((group) => (
    <section key={group.id} aria-labelledby={`group-${group.id}`} className="space-y-4">
      <h2 id={`group-${group.id}`} className="font-display text-2xl font-bold text-primary">
        {group.title}
      </h2>
      {SITE_CONTENT_NAMES.filter((name) => SITE_CONTENT_FIELDS[name].group === group.id).map(
        (name) => {
          const field = SITE_CONTENT_FIELDS[name];
          const value = content[name];
          const last = changed.get(field.key);
          return (
            <div
              key={name}
              className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
            >
              <p className="mb-3 text-xs text-secondary">
                {last
                  ? `Last changed ${dateTimeFormat.format(new Date(last.at))}${last.by ? ` by ${last.by}` : ""}`
                  : `Not given yet (client input #${field.input})`}
              </p>
              <SiteContentForm
                action={updateSiteContent.bind(null, name)}
                label={field.label}
                hint={field.hint}
                kind={field.kind}
                max={field.max}
                initialText={toEditText(name, value)}
                initialArticles={field.kind === "articles" ? ((value as FaithArticle[]) ?? []) : []}
              />
            </div>
          );
        },
      )}
    </section>
  ));
}

export default SiteContentPage;
