"use server";

import { after } from "next/server";

import { sendContactMessage, sendContactReceipt } from "@/lib/email/send";
import { createPublicClient } from "@/lib/supabase/public";
import type { FormState } from "@/lib/validation/auth";
import { CONTACT_DAILY_LIMIT, contactSchema, isLikelyBot } from "@/lib/validation/contact";
import { parseFormData } from "@/lib/validation/form";

// The contact form (Stage 2, step 2.6). Public: anyone can send. The Vercel
// Firewall rate-limits POSTs to /contact per IP, a honeypot field turns away
// simple bots, and claim_contact_send() caps the total per day. Messages go to EMAIL_TO (the office inbox; the developer's until GHTI
// supplies one, client input #10). Never log the sender's details or message.

const SENT: FormState = {
  status: "success",
  message: "Thank you. Your message has been sent, and we have emailed you a confirmation.",
};

export async function sendContactForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseFormData(contactSchema, formData);
  if (!parsed.ok) return parsed.state;
  // Bots get the same answer as people, so they learn nothing.
  if (isLikelyBot(parsed.data)) return SENT;

  const office = process.env.EMAIL_TO;
  if (!office) {
    console.error("[contact] EMAIL_TO is not set; message not sent.");
    return {
      status: "error",
      message: "The contact form is not available just now. Please call or email the office.",
    };
  }

  // A slot of today's cap, taken before sending (one claim at a time in the database).
  const { data: allowed, error: claimError } = await createPublicClient().rpc(
    "claim_contact_send",
    { p_daily_limit: CONTACT_DAILY_LIMIT },
  );
  if (claimError || !allowed) {
    return {
      status: "error",
      message: claimError
        ? "We could not send your message. Please try again in a moment."
        : "We have received a lot of messages today. Please try again tomorrow, or call or email the office.",
    };
  }

  const { name, email, phone, message } = parsed.data;
  const outcome = await sendContactMessage({ to: office, name, email, phone, message });
  if (!outcome.sent[0]) {
    return {
      status: "error",
      message: outcome.quotaReached
        ? "We cannot send messages just now. Please try again tomorrow, or call the office."
        : "We could not send your message. Please try again in a moment.",
    };
  }

  after(() => sendContactReceipt({ to: email, name }));
  return SENT;
}
