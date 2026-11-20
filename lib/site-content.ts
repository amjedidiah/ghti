import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";
import { normalisePhone } from "@/lib/validation/application";

// GHTI's own words for the public pages, edited by admins in /admin/content
// (Stage 3, step 3.5) and stored in `site_content`. This registry says what
// each piece is, which client input it answers, how it is edited and how it
// is checked. Anything missing or malformed reads as null, and the page shows
// a "Waiting for GHTI" placeholder. Pure; tested in site-content.test.ts.

export type FaithArticle = { title: string; body: string };

type Kind = "text" | "line" | "email" | "phone" | "paragraphs" | "articles";
type ValueOf<K extends Kind> = K extends "paragraphs"
  ? string[]
  : K extends "articles"
    ? FaithArticle[]
    : string;

export const SITE_CONTENT_GROUPS = [
  { id: "home", title: "Home and About" },
  { id: "faith", title: "Statement of Faith" },
  { id: "contact", title: "Contact details" },
  { id: "admissions", title: "Admissions" },
  { id: "privacy", title: "Privacy notice" },
] as const;

type Group = (typeof SITE_CONTENT_GROUPS)[number]["id"];

type FieldDef = {
  /** The row's key in `site_content`. */
  key: string;
  label: string;
  hint: string;
  /** Row number in docs/client_inputs.md. */
  input: number;
  group: Group;
  kind: Kind;
  /** Longest text, in characters (per paragraph or article body for lists). */
  max: number;
};

export const SITE_CONTENT_FIELDS = {
  welcome: {
    key: "welcome",
    label: "Welcome banner",
    hint: "One or two sentences at the top of the home page.",
    input: 9,
    group: "home",
    kind: "text",
    max: 500,
  },
  mission: {
    key: "mission",
    label: "Mission statement",
    hint: "Shown on the home and About pages.",
    input: 9,
    group: "home",
    kind: "text",
    max: 600,
  },
  history: {
    key: "history",
    label: "History",
    hint: "On the About page. Leave an empty line between paragraphs.",
    input: 9,
    group: "home",
    kind: "paragraphs",
    max: 3000,
  },
  statementOfFaith: {
    key: "statement_of_faith",
    label: "Articles of faith",
    hint: "Each article's title and text, in order. The home page lists the titles.",
    input: 9,
    group: "faith",
    kind: "articles",
    max: 3000,
  },
  contactAddress: {
    key: "contact_address",
    label: "Office address",
    hint: "As it should appear on the contact page and in the footer.",
    input: 10,
    group: "contact",
    kind: "text",
    max: 300,
  },
  contactPhone: {
    key: "contact_phone",
    label: "Office phone number",
    hint: "One number, e.g. 0803 123 4567. Visitors can tap it to call.",
    input: 10,
    group: "contact",
    kind: "phone",
    max: 32,
  },
  contactEmail: {
    key: "contact_email",
    label: "Office email",
    hint: "Shown on the contact page and in the footer.",
    input: 10,
    group: "contact",
    kind: "email",
    max: 254,
  },
  mapQuery: {
    key: "map_query",
    label: "Map location",
    hint: "What to search for on Google Maps, e.g. the campus name and town.",
    input: 10,
    group: "contact",
    kind: "line",
    max: 200,
  },
  officeHours: {
    key: "office_hours",
    label: "Office hours",
    hint: "e.g. Monday to Friday, 9am to 4pm.",
    input: 10,
    group: "contact",
    kind: "line",
    max: 200,
  },
  applicationFee: {
    key: "application_fee",
    label: "Application fee and how to pay",
    hint: "The amount and the payment details (bank, account name and number). Shown on the admissions page and beside the proof-of-payment upload.",
    input: 29,
    group: "admissions",
    kind: "text",
    max: 1000,
  },
  dataController: {
    key: "data_controller",
    label: "Data controller",
    hint: "The legal name of the organisation responsible for personal data.",
    input: 13,
    group: "privacy",
    kind: "line",
    max: 200,
  },
  privacyEmail: {
    key: "privacy_email",
    label: "Email for data-protection requests",
    hint: "Where people ask to see, correct or delete their data.",
    input: 13,
    group: "privacy",
    kind: "email",
    max: 254,
  },
} as const satisfies Record<string, FieldDef>;

export type SiteContentName = keyof typeof SITE_CONTENT_FIELDS;
export type SiteContent = {
  [N in SiteContentName]: ValueOf<(typeof SITE_CONTENT_FIELDS)[N]["kind"]> | null;
};

export const SITE_CONTENT_NAMES = Object.keys(SITE_CONTENT_FIELDS) as SiteContentName[];

export function isSiteContentName(value: string): value is SiteContentName {
  return Object.hasOwn(SITE_CONTENT_FIELDS, value);
}

const filled = z.string().trim().min(1);
const STORED: Record<Kind, z.ZodType> = {
  text: filled,
  line: filled,
  email: filled,
  phone: filled,
  paragraphs: z.array(filled).min(1),
  articles: z.array(z.object({ title: filled, body: filled })).min(1),
};

/** Stored rows -> every piece of content, null where missing or malformed. */
export function readSiteContent(rows: readonly { key: string; value: Json }[]): SiteContent {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(
    SITE_CONTENT_NAMES.map((name) => {
      const field = SITE_CONTENT_FIELDS[name];
      const parsed = STORED[field.kind].safeParse(byKey.get(field.key));
      return [name, parsed.success ? parsed.data : null];
    }),
  ) as SiteContent;
}

/** A stored value as the text an admin edits ("" when empty). Paragraphs: one blank line apart. */
export function toEditText(name: SiteContentName, value: SiteContent[SiteContentName]): string {
  if (value === null) return "";
  if (SITE_CONTENT_FIELDS[name].kind === "paragraphs") return (value as string[]).join("\n\n");
  return typeof value === "string" ? value : "";
}

export type ParsedContent = { ok: true; value: Json | null } | { ok: false; message: string };

const MAX_ARTICLES = 40;

/**
 * What an admin submitted for one piece of content -> the value to store, or
 * null to clear it (the page then shows its placeholder again). Text kinds
 * read `value`; articles read the lists `title` and `body`.
 */
export function parseSiteContentForm(name: SiteContentName, form: FormData): ParsedContent {
  const field: FieldDef = SITE_CONTENT_FIELDS[name];
  const tooLong = `Keep it under ${field.max.toLocaleString("en-NG")} characters.`;

  if (field.kind === "articles") {
    const titles = form.getAll("title").map((value) => String(value).trim());
    const bodies = form.getAll("body").map((value) => String(value).trim());
    const articles = titles
      .map((title, index) => ({ title, body: bodies[index] ?? "" }))
      .filter((article) => article.title || article.body);
    if (articles.some((article) => !article.title || !article.body)) {
      return { ok: false, message: "Each article needs a title and its text." };
    }
    if (articles.length > MAX_ARTICLES) {
      return { ok: false, message: `Keep it to ${MAX_ARTICLES} articles or fewer.` };
    }
    if (articles.some((article) => article.title.length > 200 || article.body.length > field.max)) {
      return {
        ok: false,
        message: `Keep titles under 200 characters and each article under ${field.max.toLocaleString("en-NG")}.`,
      };
    }
    return { ok: true, value: articles.length > 0 ? articles : null };
  }

  const text = String(form.get("value") ?? "").trim();
  if (text === "") return { ok: true, value: null };

  if (field.kind === "paragraphs") {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (paragraphs.some((paragraph) => paragraph.length > field.max)) {
      return {
        ok: false,
        message: `Keep each paragraph under ${field.max.toLocaleString("en-NG")} characters.`,
      };
    }
    return { ok: true, value: paragraphs };
  }
  if (text.length > field.max) return { ok: false, message: tooLong };
  if (field.kind === "email" && !z.email().safeParse(text).success) {
    return { ok: false, message: "Enter a valid email address, like office@example.com." };
  }
  if (field.kind === "phone" && normalisePhone(text) === null) {
    return { ok: false, message: "Enter a valid phone number, like 0803 123 4567." };
  }
  if (field.kind === "line" && /\n/.test(text)) {
    return { ok: false, message: "Keep it to one line." };
  }
  return { ok: true, value: text };
}
