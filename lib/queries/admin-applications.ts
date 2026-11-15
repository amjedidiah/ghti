import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

/** Filters on the applications list. Values are safe for URLs: no personal data. */
export const APPLICATION_FILTERS = {
  "needs-review": { label: "Needs review", statuses: ["submitted", "under_review"] },
  admitted: { label: "Admitted", statuses: ["admitted"] },
  rejected: { label: "Not admitted", statuses: ["rejected"] },
  drafts: { label: "Drafts", statuses: ["draft"] },
  all: {
    label: "All",
    statuses: ["submitted", "under_review", "admitted", "rejected", "withdrawn", "draft"],
  },
} as const satisfies Record<string, { label: string; statuses: readonly ApplicationStatus[] }>;

export type ApplicationFilter = keyof typeof APPLICATION_FILTERS;

export function parseFilter(value: string | string[] | undefined): ApplicationFilter {
  return typeof value === "string" && value in APPLICATION_FILTERS
    ? (value as ApplicationFilter)
    : "needs-review";
}

/** Up to 500 applications for the list; names are filtered in the browser (never in the URL). */
export async function listApplications(filter: ApplicationFilter) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, surname, first_name, other_names, email, submitted_at, created_at, programme:programmes(title, level), intake:terms(session, name)",
    )
    .in("status", [...APPLICATION_FILTERS[filter].statuses])
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) throw new Error(`Could not load applications: ${error.message}`);
  return data;
}

export type ApplicationListItem = Awaited<ReturnType<typeof listApplications>>[number];

/** Number of applications per status, for the overview. */
export async function countApplicationsByStatus() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("applications").select("status");
  if (error) throw new Error(`Could not count applications: ${error.message}`);
  const counts: Partial<Record<ApplicationStatus, number>> = {};
  for (const row of data) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}

/** One application with everything a reviewer needs, or null. */
export async function getApplicationForReview(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "*, programme:programmes(title, level), intake:terms(session, name), reviewer:profiles!applications_reviewed_by_fkey(full_name), documents(id, kind, file_name, size_bytes, mime, created_at)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the application: ${error.message}`);
  return data;
}

export type ApplicationForReview = NonNullable<Awaited<ReturnType<typeof getApplicationForReview>>>;
