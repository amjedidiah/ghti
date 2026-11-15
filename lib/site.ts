// Site-wide settings and the shared CRM links.
// Contact details stay null until the client supplies them (development plan,
// "Content needed from the client"); components hide anything that is null.

export const site = {
  name: "GHTI",
  /** Full institutional name: open question 1. */
  fullName: null as string | null,
  ministry: "Charismatic Renewal Ministries",
  ministryUrl: "https://crm-world.org.ng",
  description:
    "Certificate, Diploma and Degree programmes of Charismatic Renewal Ministries. Apply online, follow your studies and see your results in one place.",
  contact: {
    address: null as string | null,
    phone: null as string | null,
    email: null as string | null,
  },
};

/** The six links shared by every CRM subdomain header. Keep in sync with cwl and protection. */
export const crmNavLinks = [
  { name: "Home", href: "https://crm-world.org.ng/" },
  { name: "Discover CRM", href: "https://crm-world.org.ng/about-us/" },
  { name: "Connect", href: "https://crm-world.org.ng/discover-crm/" },
  { name: "Next Steps", href: "https://crm-world.org.ng/next-steps/" },
  { name: "Grow", href: "https://crm-world.org.ng/crm-reflections/" },
  { name: "Contacts", href: "https://crm-world.org.ng/contacts/" },
] as const;

/** GHTI's own navigation. */
export const ghtiNavLinks = [
  { name: "Academics", href: "/academics" },
  { name: "Admissions", href: "/admissions" },
  { name: "Contact", href: "/contact" },
] as const;

/** Footer-only links: about the institution and legal pages. */
export const footerLinks = [
  { name: "About", href: "/about" },
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
