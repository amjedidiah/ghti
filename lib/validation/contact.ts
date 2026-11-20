import { z } from "zod";

// The contact form on /contact (Stage 2, step 2.6). Pure; tested in contact.test.ts.

/**
 * Most contact messages sent per UTC day (2 emails each). Keeps the form from
 * using up Resend's 100 a day, which sign-up and sign-in emails also need.
 */
export const CONTACT_DAILY_LIMIT = 30;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Keep your name under 100 characters.")
    // The name goes into an email subject: no line breaks or tabs.
    .transform((name) => name.replace(/\s+/g, " ")),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address, so we can reply.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address, like name@example.com.")),
  phone: z.string().trim().max(32, "Keep the phone number under 32 characters.").default(""),
  message: z
    .string()
    .trim()
    .min(10, "Write a little more, so we can help (at least 10 characters).")
    .max(3000, "Keep your message under 3,000 characters."),
  /**
   * Honeypot: hidden from people, so only bots fill it in. A filled one is
   * accepted quietly and nothing is sent.
   */
  website: z.string().max(200).default(""),
});

export type ContactValues = z.input<typeof contactSchema>;

export function isLikelyBot(values: { website?: string }): boolean {
  return (values.website ?? "").trim() !== "";
}
