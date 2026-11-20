import "server-only";

import { render, toPlainText } from "@react-email/components";
import type { ReactElement } from "react";

import ApplicationDecision, { applicationDecisionSubject } from "@/emails/ApplicationDecision";
import ApplicationSubmitted, { applicationSubmittedSubject } from "@/emails/ApplicationSubmitted";
import ResultsPublished, { resultsPublishedSubject } from "@/emails/ResultsPublished";
import StudentWelcome, { studentWelcomeSubject } from "@/emails/StudentWelcome";
import { sendEmails, type EmailMessage, type SendOutcome } from "@/lib/email/transport";

// One function per transactional email (development plan, "Email
// Notifications"). Call them from Server Actions inside `after()` so the
// action never waits on, or fails because of, an email.

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function message(to: string, subject: string, element: ReactElement): Promise<EmailMessage> {
  const html = await render(element);
  return { to, subject, html, text: toPlainText(html) };
}

export async function sendApplicationSubmitted(input: {
  to: string;
  name: string;
  programme: string;
  intake: string | null;
}): Promise<SendOutcome> {
  const { to, ...props } = input;
  return sendEmails("application-submitted", [
    await message(
      to,
      applicationSubmittedSubject,
      <ApplicationSubmitted {...props} siteUrl={siteUrl()} />,
    ),
  ]);
}

export async function sendApplicationDecision(input: {
  to: string;
  name: string;
  programme: string;
  decision: "admitted" | "rejected";
}): Promise<SendOutcome> {
  const { to, ...props } = input;
  return sendEmails("application-decision", [
    await message(
      to,
      applicationDecisionSubject(props.decision),
      <ApplicationDecision {...props} siteUrl={siteUrl()} />,
    ),
  ]);
}

export async function sendStudentWelcome(input: {
  to: string;
  name: string;
  programme: string;
  matricNo: string;
}): Promise<SendOutcome> {
  const { to, ...props } = input;
  return sendEmails("student-welcome", [
    await message(to, studentWelcomeSubject, <StudentWelcome {...props} siteUrl={siteUrl()} />),
  ]);
}

export async function sendResultsPublished(
  term: string,
  recipients: { to: string; name: string }[],
): Promise<SendOutcome> {
  const messages = await Promise.all(
    recipients.map(({ to, name }) =>
      message(
        to,
        resultsPublishedSubject(term),
        <ResultsPublished name={name} term={term} siteUrl={siteUrl()} />,
      ),
    ),
  );
  return sendEmails("results-published", messages);
}
