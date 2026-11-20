import "server-only";

import { Resend } from "resend";

// Sends rendered emails. In the cloud (RESEND_API_KEY set) through Resend; in
// local development (MAILPIT_URL set) to the local Supabase stack's Mailpit
// inbox, so email flows are tested without spending the Resend quota (100 a
// day, shared with the sign-in emails Supabase sends). Never log addresses,
// names or content (NDPA 2023): only the kind of email and the error name.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Overrides EMAIL_REPLY_TO, e.g. the sender of a contact-form message. */
  replyTo?: string;
};

export type SendOutcome = {
  /** One entry per message, in order: true when it was accepted for delivery. */
  sent: boolean[];
  /** Resend refused the rest because a daily or monthly quota is used up. */
  quotaReached: boolean;
};

/** Resend accepts at most 100 emails per batch call. */
const BATCH_SIZE = 100;

const DEFAULT_FROM = "GHTI <no-reply@ghti.crm-world.org.ng>";

function from(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

function replyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || undefined;
}

async function sendThroughMailpit(baseUrl: string, messages: EmailMessage[]): Promise<boolean[]> {
  const sender = from().match(/^(.*)<(.+)>$/);
  const fromField = sender
    ? { Name: sender[1].trim(), Email: sender[2].trim() }
    : { Email: from() };
  return Promise.all(
    messages.map(async (message) => {
      try {
        const response = await fetch(new URL("/api/v1/send", baseUrl), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            From: fromField,
            To: [{ Email: message.to }],
            ...(message.replyTo ? { ReplyTo: [{ Email: message.replyTo }] } : {}),
            Subject: message.subject,
            HTML: message.html,
            Text: message.text,
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    }),
  );
}

async function sendThroughResend(apiKey: string, messages: EmailMessage[]): Promise<SendOutcome> {
  const resend = new Resend(apiKey);
  const sent: boolean[] = [];
  let quotaReached = false;

  for (let start = 0; start < messages.length; start += BATCH_SIZE) {
    const chunk = messages.slice(start, start + BATCH_SIZE);
    if (quotaReached) {
      sent.push(...chunk.map(() => false));
      continue;
    }
    const payload = chunk.map((message) => ({
      from: from(),
      to: message.to,
      replyTo: message.replyTo ?? replyTo(),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }));
    const { error } =
      payload.length === 1
        ? await resend.emails.send(payload[0])
        : await resend.batch.send(payload);
    if (error) {
      quotaReached =
        error.name === "daily_quota_exceeded" || error.name === "monthly_quota_exceeded";
      console.error(`[email] Resend refused ${chunk.length} email(s): ${error.name}`);
    }
    sent.push(...chunk.map(() => !error));
  }

  return { sent, quotaReached };
}

/** Send emails. Never throws: failures come back as `false` in `sent`. */
export async function sendEmails(kind: string, messages: EmailMessage[]): Promise<SendOutcome> {
  if (messages.length === 0) return { sent: [], quotaReached: false };

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) return await sendThroughResend(apiKey, messages);

    const mailpit = process.env.MAILPIT_URL;
    if (mailpit) {
      return { sent: await sendThroughMailpit(mailpit, messages), quotaReached: false };
    }
  } catch (error) {
    console.error(`[email] ${kind} failed: ${error instanceof Error ? error.name : "unknown"}`);
    return { sent: messages.map(() => false), quotaReached: false };
  }

  console.warn(`[email] ${kind} not sent: set RESEND_API_KEY (or MAILPIT_URL locally).`);
  return { sent: messages.map(() => false), quotaReached: false };
}
