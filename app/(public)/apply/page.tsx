import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import ApplicationForm from "@/components/applications/ApplicationForm";
import SignOutButton from "@/components/auth/SignOutButton";
import SubmitButton from "@/components/forms/SubmitButton";
import PageHeader from "@/components/shared/PageHeader";
import { startApplication, type RecordedDocument } from "@/lib/applications/actions";
import { rowToValues } from "@/lib/applications/mapping";
import { requireRole } from "@/lib/auth/session";
import { getMyApplication, getOpenIntakes } from "@/lib/queries/applications";
import { getPublishedProgrammes } from "@/lib/queries/programmes";

export const metadata: Metadata = { title: "My application", robots: { index: false } };

function ApplyPage() {
  return (
    <Suspense fallback={<PageHeader eyebrow="Applicant" title="My application" />}>
      <ApplyContent />
    </Suspense>
  );
}

async function ApplyContent() {
  const user = await requireRole("applicant");
  const application = await getMyApplication(user.id);

  if (!application || application.status === "rejected" || application.status === "withdrawn") {
    return <StartApplication name={user.fullName} email={user.email} />;
  }
  if (application.status !== "draft") redirect("/apply/status");

  const [programmes, intakes] = await Promise.all([getPublishedProgrammes(), getOpenIntakes()]);
  const documentOf = (kind: string): RecordedDocument | null => {
    const doc = application.documents.find((d) => d.kind === kind);
    return doc
      ? { id: doc.id, kind: doc.kind, fileName: doc.file_name, sizeBytes: doc.size_bytes }
      : null;
  };

  return (
    <>
      <PageHeader eyebrow="Applicant" title="Your application">
        <p>
          Fill in each section, upload your transcript, then submit. You can save a draft and come
          back at any time.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <ApplicationForm
          applicationId={application.id}
          ownerId={user.id}
          initialValues={rowToValues(application)}
          programmes={programmes.map(({ id, title, level }) => ({ id, title, level }))}
          intakes={intakes}
          documents={{
            transcript: documentOf("transcript"),
            id_card: documentOf("id_card"),
            photo: documentOf("photo"),
          }}
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
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-2xl font-bold text-primary">Before you start</h2>
          <ul className="mt-4 space-y-3 text-secondary">
            {[
              "It takes about 15 minutes. You can save and come back later.",
              "Have your transcript or result ready: a PDF, or a clear photo taken with your phone.",
              "You will need the name and phone number of your next of kin.",
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
