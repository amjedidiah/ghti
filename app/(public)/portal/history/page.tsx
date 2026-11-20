import { FileDown } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { requireRole } from "@/lib/auth/session";
import { getMyApplication } from "@/lib/queries/applications";
import { getMyRegistrations, getMyStudentRecord } from "@/lib/queries/student";
import { groupResults } from "@/lib/results";

export const metadata: Metadata = { title: "Academic history", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "long" });

type Event = { date: string | null; title: string; detail?: string };

/** Academic history: application, admission, enrolment, then each term studied. */
function HistoryPage() {
  return (
    <>
      <PageHeader eyebrow="Student portal" title="Academic history">
        <p>From your application to your latest term.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading your history…</p>}>
          <History />
        </Suspense>
      </div>
    </>
  );
}

async function History() {
  const user = await requireRole("student");
  const [application, record, registrations] = await Promise.all([
    getMyApplication(user.id),
    getMyStudentRecord(user.id),
    getMyRegistrations(user.id),
  ]);
  const { terms } = groupResults(registrations);

  const events: Event[] = [];
  if (application?.submitted_at) {
    events.push({
      date: application.submitted_at,
      title: "Applied",
      detail: application.programme?.title,
    });
  }
  if (application?.status === "admitted" && application.decided_at) {
    events.push({ date: application.decided_at, title: "Offered admission" });
  }
  if (record) {
    events.push({
      date: record.created_at,
      title: `Enrolled as ${record.matric_no}`,
      detail: [
        record.programme?.title,
        record.entry_term
          ? `starting ${record.entry_term.name}, ${record.entry_term.session}`
          : null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }
  for (const term of terms) {
    const published = term.courses.filter((course) => course.published).length;
    events.push({
      date: null,
      title: term.label,
      detail: `${term.courses.length} course${term.courses.length === 1 ? "" : "s"}, ${term.unitsRegistered} credit units · ${
        published === term.courses.length
          ? "all results published"
          : `${published} of ${term.courses.length} results published`
      }`,
    });
  }

  if (events.length === 0) {
    return <p className="text-secondary">Nothing to show yet.</p>;
  }

  const anyPublished = terms.some((term) => term.courses.some((course) => course.published));

  return (
    <>
      <section
        aria-labelledby="transcript-heading"
        className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 id="transcript-heading" className="font-display text-xl font-bold text-primary">
          Unofficial transcript
        </h2>
        <p className="mt-2 text-secondary">
          A PDF of your published results, term by term, with your GPA and CGPA. It is for your own
          use: for an official transcript, contact the registrar.
        </p>
        {anyPublished ? (
          // A plain link: the PDF is a download, not a page to prefetch.
          <a
            href="/portal/transcript"
            download
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 font-semibold text-on-brand hover:bg-brand-deep"
          >
            <FileDown className="size-5" aria-hidden />
            Download PDF
          </a>
        ) : (
          <p className="mt-4 text-sm font-semibold text-secondary">
            Available once your first results are published.
          </p>
        )}
      </section>
      <ol className="relative space-y-6 border-l-2 border-border pl-6">
        {events.map((event, index) => (
          <li key={`${event.title}-${index}`} className="relative">
            <span
              aria-hidden
              className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full bg-accent ring-4 ring-bg"
            />
            {event.date && (
              <p className="text-sm text-secondary">{dateFormat.format(new Date(event.date))}</p>
            )}
            <p className="font-semibold text-primary">{event.title}</p>
            {event.detail && <p className="text-sm text-secondary">{event.detail}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}

export default HistoryPage;
