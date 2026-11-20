import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import PageHeader from "@/components/shared/PageHeader";
import Placeholder from "@/components/shared/Placeholder";
import { content } from "@/lib/content";
import { getOpenIntakes } from "@/lib/queries/applications";

export const metadata: Metadata = {
  title: "Admissions",
  description:
    "How to apply to GHTI online: create an account, answer the application step by step, upload your certificates and photo.",
};

// Requirements and key dates beyond the open intakes come from the client
// (docs/client_inputs.md #6). Entry requirements live on each programme page.

const STEPS = [
  {
    title: "Choose a programme",
    body: "Read about our Certificate, Ordinary Diploma and Post Graduate Diploma programmes and check their entry requirements.",
    link: { href: "/academics", label: "See programmes" },
  },
  {
    title: "Create an account",
    body: "Use your email address and a password. We will email you a link to confirm it.",
    link: { href: "/apply/register", label: "Create an account" },
  },
  {
    title: "Fill in the application",
    body: "About you, your next of kin, work, faith and church, education and two referees. Your answers are saved as you go, so you can come back whenever you like.",
  },
  {
    title: "Upload your documents and submit",
    body: "Your certificates or results and a passport photograph are required: PDFs or clear phone photos. You can add your pastor's endorsement and proof of the application fee. Then submit and follow your application's status online.",
  },
];

async function AdmissionsPage() {
  const intakes = await getOpenIntakes();

  return (
    <>
      <PageHeader eyebrow="Admissions" title="How to apply">
        <p>Applying to GHTI is done online, and works well on a phone.</p>
      </PageHeader>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <ol className="space-y-6 lg:col-span-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-brand"
              >
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-primary">{step.title}</h2>
                <p className="mt-1 leading-relaxed text-secondary">{step.body}</p>
                {step.link && (
                  <Link
                    href={step.link.href}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-strong hover:underline"
                  >
                    {step.link.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-primary">Application fee</h2>
            <div className="mt-3 text-secondary">
              {content.applicationFee ?? (
                <Placeholder what="the application fee and how to pay it." input={29} />
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-primary">Open intakes</h2>
            {intakes.length > 0 ? (
              <ul className="mt-3 space-y-1 text-secondary">
                {intakes.map((intake) => (
                  <li key={intake.id}>{intake.label}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-secondary">
                Applications are not open right now. You can still create an account and prepare
                your application.
              </p>
            )}
            <Link
              href="/apply/register"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-3 font-semibold text-on-brand hover:bg-brand-deep"
            >
              Start your application
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <p className="mt-3 text-center text-sm text-secondary">
              Already applied?{" "}
              <Link href="/sign-in" className="font-semibold text-accent-strong hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

export default AdmissionsPage;
