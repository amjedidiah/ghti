import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import ApplicationForm from "@/components/applications/ApplicationForm";
import type { DocumentsByKind } from "@/components/applications/steps/DocumentsStep";
import SignOutButton from "@/components/auth/SignOutButton";
import SubmitButton from "@/components/forms/SubmitButton";
import PageHeader from "@/components/shared/PageHeader";
import Placeholder from "@/components/shared/Placeholder";
import { saveApplication, startApplication, submitApplication } from "@/lib/applications/actions";
import { APPLICATION_DOCUMENTS } from "@/lib/applications/documents";
import { rowToValues } from "@/lib/applications/mapping";
import { parseStep } from "@/lib/applications/steps";
import { requireRole } from "@/lib/auth/session";
import { getMyApplication, getOpenIntakes } from "@/lib/queries/applications";
import { getPublishedProgrammes } from "@/lib/queries/programmes";
import { getSiteContent } from "@/lib/queries/site-content";

export const metadata: Metadata = { title: "My application", robots: { index: false } };

function ApplyPage({ searchParams }: PageProps<"/apply">) {
  return (
    <Suspense fallback={<PageHeader eyebrow="Applicant" title="My application" />}>
      <ApplyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ApplyContent({ searchParams }: Pick<PageProps<"/apply">, "searchParams">) {
  const user = await requireRole("applicant");
  const application = await getMyApplication(user.id);

  if (!application || application.status === "rejected" || application.status === "withdrawn") {
    return <StartApplication name={user.fullName} email={user.email} />;
  }
  if (application.status !== "draft") redirect("/apply/status");

  const [programmes, intakes, { step }, content] = await Promise.all([
    getPublishedProgrammes(),
    getOpenIntakes(),
    searchParams,
    getSiteContent(),
  ]);
  const documents = Object.fromEntries(
    APPLICATION_DOCUMENTS.map((slot) => [
      slot.kind,
      application.documents
        .filter((doc) => doc.kind === slot.kind)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          fileName: doc.file_name,
          sizeBytes: doc.size_bytes,
        })),
    ]),
  ) as DocumentsByKind;

  return (
    <>
      <PageHeader eyebrow="Applicant" title="Your application">
        <p>
          The questions of GHTI&apos;s application form, step by step. Your answers are saved as you
          go, so you can stop and come back at any time.
        </p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <ApplicationForm
          applicationId={application.id}
          ownerId={user.id}
          initialValues={rowToValues(application)}
          initialStep={parseStep(step)}
          initialDocuments={documents}
          programmes={programmes.map(({ id, title, level }) => ({ id, title, level }))}
          intakes={intakes}
          fee={
            content.applicationFee ?? (
              <Placeholder what="the application fee and how to pay it." input={29} />
            )
          }
          save={saveApplication.bind(null, application.id)}
          submit={submitApplication.bind(null, application.id)}
        />
      </div>
    </>
  );
}

function StartApplication({ name, email }: { name: string; email: string }) {
  return (
    <>
      <PageHeader eyebrow="Applicant" title={`Welcome, ${name || "applicant"}`}>
        <p>Your account is ready. When you are ready, start your application.</p>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-bold text-primary">Before you start</h2>
          <ul className="mt-4 space-y-3 text-secondary">
            {[
              "It takes about 20 minutes, in short steps. Your answers are saved as you go.",
              "Have your certificates or results and a passport photograph ready: a PDF, or a clear photo taken with your phone.",
              "You will need the names and phone numbers of your next of kin, your pastor and two referees.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <form action={startApplication} className="mt-8 sm:max-w-xs">
            <SubmitButton>Start my application</SubmitButton>
          </form>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm text-secondary">
          <p>Signed in as {email}</p>
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

export default ApplyPage;
