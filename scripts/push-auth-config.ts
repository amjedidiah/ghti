/**
 * Apply GHTI's auth settings and email templates to the cloud Supabase project.
 *
 *   bun run auth:push --site-url https://ghti.crm-world.org.ng                  # dry run
 *   bun run auth:push --site-url https://ghti.crm-world.org.ng --apply          # apply
 *   bun run auth:push --site-url https://ghti.crm-world.org.ng --smtp --apply   # + Resend SMTP
 *
 * Source of truth: supabase/templates/*.html and the values below, which
 * mirror supabase/config.toml (local). `supabase config push` is not used
 * because config.toml points at localhost. Rerun when the domain changes.
 *
 * Needs SUPABASE_ACCESS_TOKEN (a personal access token) or a logged-in
 * Supabase CLI (~/.supabase/access-token). Prints no secrets.
 *
 * --smtp sends auth emails through Resend (smtp.resend.com) from
 * no-reply@ghti.crm-world.org.ng. The API key comes from RESEND_API_KEY or the
 * macOS keychain item `ghti-resend-api-key`; it is never printed.
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const PROJECT_REF = "htbaujxaorlblkixiixx";
/** Vercel preview URLs for this project, so email links also work on previews. */
const PREVIEW_PATTERN = "https://ghti-*-amjedidiahs-projects.vercel.app/**";

const { values } = parseArgs({
  options: {
    "site-url": { type: "string" },
    apply: { type: "boolean", default: false },
    smtp: { type: "boolean", default: false },
  },
});

const siteUrl = values["site-url"]?.replace(/\/+$/, "");
if (!siteUrl || !/^https:\/\/[^/]+$/.test(siteUrl)) {
  console.error("Usage: bun run auth:push --site-url https://example.org [--apply]");
  process.exit(1);
}

async function accessToken(): Promise<string> {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    return (await readFile(join(homedir(), ".supabase", "access-token"), "utf8")).trim();
  } catch {
    console.error("Set SUPABASE_ACCESS_TOKEN or run `supabase login`.");
    process.exit(1);
  }
}

/** Resend API key from the environment or the macOS keychain; never printed. */
function resendApiKey(): string {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const result = Bun.spawnSync(
    ["security", "find-generic-password", "-s", "ghti-resend-api-key", "-w"],
    { stderr: "ignore" },
  );
  const key = result.stdout.toString().trim();
  if (result.exitCode !== 0 || !key.startsWith("re_")) {
    console.error(
      "No Resend API key: set RESEND_API_KEY or add the keychain item `ghti-resend-api-key`.",
    );
    process.exit(1);
  }
  return key;
}

/** Sender for auth emails (sign-up, sign-in links, resets, invitations). */
const SMTP_SENDER = { email: "no-reply@ghti.crm-world.org.ng", name: "GHTI" };

const template = (name: string) => readFile(join("supabase", "templates", `${name}.html`), "utf8");

const desired: Record<string, string | number | boolean> = {
  site_url: siteUrl,
  uri_allow_list: [`${siteUrl}/**`, PREVIEW_PATTERN].join(","),
  mailer_autoconfirm: false, // email confirmation required
  password_min_length: 8,
  smtp_max_frequency: 60,
  mailer_otp_exp: 3600,
  mailer_subjects_confirmation: "Confirm your GHTI account",
  mailer_templates_confirmation_content: await template("confirmation"),
  mailer_subjects_magic_link: "Your GHTI sign-in link",
  mailer_templates_magic_link_content: await template("magic_link"),
  mailer_subjects_recovery: "Reset your GHTI password",
  mailer_templates_recovery_content: await template("recovery"),
  mailer_subjects_invite: "You have been invited to GHTI",
  mailer_templates_invite_content: await template("invite"),
  mailer_subjects_email_change: "Confirm your new GHTI email address",
  mailer_templates_email_change_content: await template("email_change"),
};

if (values.smtp) {
  Object.assign(desired, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: resendApiKey(),
    smtp_admin_email: SMTP_SENDER.email,
    smtp_sender_name: SMTP_SENDER.name,
  });
}

const api = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const headers = {
  Authorization: `Bearer ${await accessToken()}`,
  "Content-Type": "application/json",
};

const currentResponse = await fetch(api, { headers });
if (!currentResponse.ok) {
  console.error(`Could not read auth config: HTTP ${currentResponse.status}`);
  process.exit(1);
}
const current = (await currentResponse.json()) as Record<string, unknown>;

// Supabase allows custom email templates on the free tier only with custom
// SMTP (Resend: development plan, step 1.2). Until then, skip them.
const customSmtp = Boolean(current.smtp_host) || values.smtp;
if (!customSmtp) {
  console.log(
    "No custom SMTP yet: skipping email subjects and templates (Supabase defaults stay in use).\n",
  );
}

const changes = Object.fromEntries(
  Object.entries(desired).filter(
    ([key, value]) =>
      current[key] !== value && (customSmtp || !/^mailer_(subjects|templates)_/.test(key)),
  ),
);

if (Object.keys(changes).length === 0) {
  console.log("Cloud auth config already matches. Nothing to do.");
  process.exit(0);
}

for (const [key, value] of Object.entries(changes)) {
  const shown = key.includes("_content")
    ? "(template updated)"
    : key === "smtp_pass"
      ? "(Resend API key, hidden)"
      : `${JSON.stringify(current[key])} -> ${JSON.stringify(value)}`;
  console.log(`${key}: ${shown}`);
}

if (!values.apply) {
  console.log("\nDry run. Re-run with --apply to make these changes.");
  process.exit(0);
}

const response = await fetch(api, { method: "PATCH", headers, body: JSON.stringify(changes) });
if (!response.ok) {
  console.error(`Update failed: HTTP ${response.status} ${await response.text()}`);
  process.exit(1);
}
console.log(`\nApplied ${Object.keys(changes).length} change(s).`);
