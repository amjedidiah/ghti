"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import TextInput from "@/components/forms/TextInput";
import StatusBadge from "@/components/shared/StatusBadge";
import { applicantName } from "@/lib/applications/labels";
import type { ApplicationListItem } from "@/lib/queries/admin-applications";

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

function matches(item: ApplicationListItem, query: string) {
  const haystack = [item.first_name, item.other_names, item.surname, item.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * Applications with an instant name filter. Filtering happens in the browser so
 * names never appear in URLs or server logs (NDPA 2023).
 */
function ApplicationsList({ items }: { items: ApplicationListItem[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const shown = deferred.trim() ? items.filter((item) => matches(item, deferred)) : items;

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <label htmlFor="application-search" className="sr-only">
          Find by name or email
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-secondary"
          aria-hidden
        />
        <TextInput
          id="application-search"
          type="search"
          placeholder="Find by name or email"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-10"
        />
      </div>

      <p role="status" className="text-sm text-secondary">
        {shown.length === items.length
          ? `${items.length} application${items.length === 1 ? "" : "s"}`
          : `${shown.length} of ${items.length} applications`}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-8 text-center text-secondary">
          {items.length === 0 ? "Nothing here yet." : "No applications match that name."}
        </p>
      ) : (
        <>
          {/* Phones: cards */}
          <ul className="space-y-3 md:hidden">
            {shown.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/applications/${item.id}`}
                  className="block rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-primary">
                      {applicantName(item) || "(no name yet)"}
                    </p>
                    <StatusBadge status={item.status} className="shrink-0 px-2 py-0.5 text-xs" />
                  </div>
                  <p className="mt-1 text-sm text-secondary">
                    {item.programme?.title ?? "No programme yet"}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    {item.submitted_at
                      ? `Submitted ${dateFormat.format(new Date(item.submitted_at))}`
                      : `Started ${dateFormat.format(new Date(item.created_at))}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Larger screens: table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Applicant
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Programme
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Intake
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Submitted
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/applications/${item.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {applicantName(item) || "(no name yet)"}
                      </Link>
                      <p className="text-xs text-secondary">{item.email}</p>
                    </td>
                    <td className="px-4 py-3 text-secondary">{item.programme?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-secondary">
                      {item.intake ? `${item.intake.name}, ${item.intake.session}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {item.submitted_at ? dateFormat.format(new Date(item.submitted_at)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} className="px-2 py-0.5 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ApplicationsList;
