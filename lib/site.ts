// Site-wide settings and the shared CRM links. GHTI's own words (mission,
// contact details, privacy contacts) are site content, edited in
// /admin/content (lib/site-content.ts).

export const site = {
  name: "GHTI",
  /** Full institutional name (client input #2, received 16 Nov 2026). */
  fullName: "Great Harvest Theological Institute" as string | null,
  ministry: "Charismatic Renewal Ministries",
  ministryUrl: "https://crm-world.org.ng",
  description:
    "Certificate, Ordinary Diploma and Post Graduate Diploma in Theology at Great Harvest Theological Institute, a Charismatic Renewal Ministries institution. Apply online, follow your studies and see your results, all in one place.",
};

/** GHTI's own navigation. */
export const ghtiNavLinks = [
  { name: "About", href: "/about" },
  { name: "Academics", href: "/academics" },
  { name: "Admissions", href: "/admissions" },
  { name: "Contact", href: "/contact" },
] as const;

/** Footer-only links: about the institution and legal pages. */
export const footerLinks = [
  { name: "Statement of Faith", href: "/statement-of-faith" },
  { name: "Privacy notice", href: "/privacy" },
] as const;

export const signInLink = { name: "Portal sign-in", href: "/sign-in" } as const;

export const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/charismaticrenewalministries" },
  { name: "Instagram", href: "https://www.instagram.com/crmhqworld/" },
  { name: "YouTube", href: "https://www.youtube.com/@charismaticrenewalministries" },
] as const;

export type SocialName = (typeof socialLinks)[number]["name"];

/**
 * Canonical site URL, without a trailing slash: NEXT_PUBLIC_SITE_URL in
 * production, the deployment's own URL on Vercel previews, localhost in
 * development. Used for metadata, emails, the sitemap and robots.txt.
 */
export function siteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
