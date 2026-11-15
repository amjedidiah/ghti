import type { Metadata } from "next";
import type { ReactNode } from "react";

import PageHeader from "@/components/shared/PageHeader";
import Placeholder from "@/components/shared/Placeholder";
import { content } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${site.name} collects, uses and protects your personal data.`,
};

// Draft written from what the system actually does (development plan, data
// model and storage). GHTI must review it and supply the controller details
// (client input #13) and the retention period (client input #19).

function PrivacyPage() {
  const controller = content.dataController;
  const privacyEmail = content.privacyEmail;

  return (
    <>
      <PageHeader eyebrow="Privacy" title="Privacy notice">
        <p>
          How we collect, use and protect your personal data, under the Nigeria Data Protection Act
          2023.
        </p>
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
        {!controller && (
          <Placeholder
            what="review of this draft notice, the data controller's legal name and a contact for data requests."
            input={13}
          />
        )}

        <Section title="Who we are">
          <p>
            {controller ?? site.name}, a {site.ministry} institution, is responsible for the
            personal data described here (the data controller).
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-primary">Your account:</strong> your name, email address and a
              password (stored only in scrambled form).
            </li>
            <li>
              <strong className="text-primary">Your application:</strong> personal details (name,
              date of birth, gender, phone, email, address, state of origin, nationality, church),
              your education, and the name and phone number of your next of kin and referee.
            </li>
            <li>
              <strong className="text-primary">Your documents:</strong> the transcript, identity
              document and photograph you upload.
            </li>
            <li>
              <strong className="text-primary">If you are admitted:</strong> your student record,
              course registrations and results.
            </li>
          </ul>
          <p>
            We use only the cookies needed to keep you signed in. We do not use advertising or
            tracking cookies.
          </p>
        </Section>

        <Section title="Why we use it">
          <p>
            To consider your application for admission, to keep your academic records if you are
            admitted, and to contact you about your application or studies. We rely on your consent,
            given when you submit your application, and on what is needed to provide your education.
          </p>
        </Section>

        <Section title="Who can see it">
          <p>
            You can see your own information. Authorised GHTI staff (admissions and registry) can
            see applications and student records; every time staff open one of your documents, it is
            recorded. We never sell your data or share it for marketing.
          </p>
          <p>
            We use trusted service providers to run this website: Supabase (database and file
            storage) and Vercel (hosting). Their servers for this website are in London, United
            Kingdom, so your data is transferred outside Nigeria with safeguards required by the
            Act.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            If you are admitted, your application becomes part of your student record, which we keep
            permanently as an academic record. If you are not admitted, we delete your uploaded
            documents after a set period.
          </p>
          <Placeholder
            what="how long to keep documents of applicants who are not admitted."
            input={19}
          />
        </Section>

        <Section title="How we protect it">
          <p>
            Your data travels encrypted. Access is controlled by your role, checked by our database
            itself, not just by the website. Documents are stored privately and opened only through
            links that expire after ten minutes.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask to see the personal data we hold about you, to correct it, to delete it
            (unless we must keep it as an academic record), to object to how we use it, or to
            withdraw your consent. You can also complain to the Nigeria Data Protection Commission.
          </p>
          {privacyEmail ? (
            <p>
              To make a request, email{" "}
              <a
                href={`mailto:${privacyEmail}`}
                className="font-semibold text-accent-strong hover:underline"
              >
                {privacyEmail}
              </a>
              .
            </p>
          ) : (
            <Placeholder what="the email address for data-protection requests." input={13} />
          )}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-primary">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-secondary">{children}</div>
    </section>
  );
}

export default PrivacyPage;
