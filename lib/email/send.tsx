import "server-only";

import { render, toPlainText } from "@react-email/components";
import type { ReactElement } from "react";

import ApplicationDecision, { applicationDecisionSubject } from "@/emails/ApplicationDecision";
import ApplicationSubmitted, { applicationSubmittedSubject } from "@/emails/ApplicationSubmitted";
import ContactMessage, { contactMessageSubject } from "@/emails/ContactMessage";
import ContactReceipt, { contactReceiptSubject } from "@/emails/ContactReceipt";
import GradesReturned, { gradesReturnedSubject } from "@/emails/GradesReturned";
import GradesSubmitted, { gradesSubmittedSubject } from "@/emails/GradesSubmitted";
import LecturerAssigned, { lecturerAssignedSubject } from "@/emails/LecturerAssigned";
import ResultsPublished, { resultsPublishedSubject } from "@/emails/ResultsPublished";
import StudentWelcome, { studentWelcomeSubject } from "@/emails/StudentWelcome";
import { sendEmails, type EmailMessage, type SendOutcome } from "@/lib/email/transport";
import { siteUrl } from "@/lib/site";

// One function per transactional email (development plan, "Email
// Notifications"). Call them from Server Actions inside `after()` so the
// action never waits on, or fails because of, an email.

async function message(
  to: string,
  subject: string,
  element: ReactElement,
  replyTo?: string,
): Promise<EmailMessage> {
  const html = await render(element);
  return { to, subject, html, text: toPlainText(html), replyTo };
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

/** A contact-form message to the office (EMAIL_TO); replies go to the sender. */
export async function sendContactMessage(input: {
  to: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}): Promise<SendOutcome> {
  const { to, ...props } = input;
  return sendEmails("contact-message", [
    await message(
      to,
      contactMessageSubject(props.name),
      <ContactMessage {...props} />,
      props.email,
    ),
  ]);
}

/** "We have received your message" to the sender. Carries none of their text. */
export async function sendContactReceipt(input: {
  to: string;
  name: string;
}): Promise<SendOutcome> {
  return sendEmails("contact-receipt", [
    await message(
      input.to,
      contactReceiptSubject,
      <ContactReceipt name={input.name} siteUrl={siteUrl()} />,
    ),
  ]);
}

/** "You are teaching BIB 101" to a newly assigned lecturer. */
export async function sendLecturerAssigned(input: {
  to: string;
  name: string;
  course: string;
  term: string;
}): Promise<SendOutcome> {
  const { to, ...props } = input;
  return sendEmails("lecturer-assigned", [
    await message(
      to,
      lecturerAssignedSubject(props.course),
      <LecturerAssigned {...props} siteUrl={siteUrl()} />,
    ),
  ]);
}

/** "Grades are waiting for approval" to the office (EMAIL_TO). Counts only. */
export async function sendGradesSubmitted(input: {
  lecturer: string;
  course: string;
  term: string;
  count: number;
  offeringId: string;
}): Promise<SendOutcome | null> {
  const office = process.env.EMAIL_TO;
  if (!office) {
    console.error("[grades-submitted] EMAIL_TO is not set; the office was not emailed.");
    return null;
  }
  return sendEmails("grades-submitted", [
    await message(
      office,
      gradesSubmittedSubject(input.course),
      <GradesSubmitted {...input} siteUrl={siteUrl()} />,
    ),
  ]);
}

/** "Grades returned to you", with the office's note, to the lecturer. */
export async function sendGradesReturned(input: {
  to: string;
  name: string;
  course: string;
  term: string;
  note: string;
  count: number;
  offeringId: string;
}): Promise<SendOutcome> {
  const { to, ...props } = input;
  return sendEmails("grades-returned", [
    await message(
      to,
      gradesReturnedSubject(props.course),
      <GradesReturned {...props} siteUrl={siteUrl()} />,
    ),
  ]);
}
