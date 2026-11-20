// The local Supabase stack's Mailpit inbox, for checking emails in tests.

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type Summary = { ID: string; Subject: string; To: { Address: string }[]; Created: string };

/** Newest email to `address` received after `since`, polling for up to `timeoutMs`. */
export async function latestEmail(
  address: string,
  { since = new Date(0), timeoutMs = 10_000 }: { since?: Date; timeoutMs?: number } = {},
): Promise<{ subject: string; html: string; text: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}&limit=5`,
    );
    const { messages } = (await response.json()) as { messages: Summary[] };
    const fresh = messages.find((message) => new Date(message.Created) > since);
    if (fresh) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as {
        Subject: string;
        HTML: string;
        Text: string;
      };
      return { subject: full.Subject, html: full.HTML, text: full.Text };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email to ${address} within ${timeoutMs} ms`);
}

/** The first link in an email's HTML whose URL contains `fragment`. */
export function linkIn(html: string, fragment: string): string {
  const match = [...html.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1].replace(/&amp;/g, "&"))
    .find((href) => href.includes(fragment));
  if (!match) throw new Error(`No link containing ${fragment}`);
  return match;
}
