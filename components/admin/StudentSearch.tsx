"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import Field from "@/components/forms/Field";
import Select from "@/components/forms/Select";
import { inputClassName } from "@/components/forms/TextInput";
import DataTable, { type DataTableColumn } from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { searchStudentsAction } from "@/lib/admin/students";
import type { StudentRow, StudentSearchResults } from "@/lib/queries/admin-students";
import { cn } from "@/lib/utils";
import {
  DEFAULT_STUDENT_SEARCH,
  pageCount,
  STUDENT_SORTS,
  STUDENT_STATUS_LABELS,
  STUDENT_STATUSES,
  studentSearchSchema,
  type StudentSearch as Search_,
  type StudentSort,
} from "@/lib/validation/students";

// The search runs through a Server Action, so what an admin types (names,
// matric numbers) never lands in a URL. The last search is kept for this tab
// only (sessionStorage), so "back" from a student's file returns to it.

const STORAGE_KEY = "ghti:admin-student-search";
const TYPING_DELAY_MS = 300;

type Option = { id: string; label: string };

function readSaved(): Search_ | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = studentSearchSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function save(search: Search_) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(search));
  } catch {
    // Private mode or storage blocked: the search still works, it just is not remembered.
  }
}

const columns: DataTableColumn<StudentRow>[] = [
  { key: "name", header: "Name", sortKey: "name", cell: (row) => row.fullName || "(no name)" },
  {
    key: "matric",
    header: "Matric number",
    sortKey: "matric",
    className: "tabular-nums whitespace-nowrap",
    cell: (row) => row.matricNo,
  },
  { key: "programme", header: "Programme", cell: (row) => row.programme },
  {
    key: "entry",
    header: "Entry term",
    sortKey: "newest",
    className: "whitespace-nowrap",
    cell: (row) => row.entryTerm,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} className="px-2.5 py-0.5 text-xs" />,
  },
];

function StudentSearch({
  initial,
  programmes,
  terms,
}: {
  initial: StudentSearchResults;
  programmes: Option[];
  terms: Option[];
}) {
  const [search, setSearch] = useState<Search_>(DEFAULT_STUDENT_SEARCH);
  const [results, setResults] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const latest = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function run(next: Search_) {
    save(next);
    const ticket = ++latest.current;
    startTransition(async () => {
      const result = await searchStudentsAction(next);
      if (ticket !== latest.current) return; // a newer search has started
      if (result.ok) {
        setResults({ total: result.total, rows: result.rows });
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  function update(change: Partial<Search_>, { delay = 0 } = {}) {
    // Any change other than the page goes back to page one.
    const next = { ...search, page: 1, ...change };
    setSearch(next);
    clearTimeout(typingTimer.current);
    if (delay > 0) typingTimer.current = setTimeout(() => run(next), delay);
    else run(next);
  }

  // Coming back to the list: restore this tab's last search.
  useEffect(() => {
    const saved = readSaved();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from sessionStorage
    setSearch(saved);
    run(saved);
  }, []);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const pages = pageCount(results.total);
  const filtered =
    search.query !== "" ||
    search.programmeId !== null ||
    search.entryTermId !== null ||
    search.status !== null;

  return (
    <div className="space-y-6">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          update({});
        }}
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-6"
      >
        <Field
          id="student-query"
          label="Name or matric number"
          className="sm:col-span-2 lg:col-span-6"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-secondary"
              aria-hidden
            />
            <input
              id="student-query"
              type="search"
              value={search.query}
              onChange={(event) =>
                update({ query: event.target.value }, { delay: TYPING_DELAY_MS })
              }
              placeholder="e.g. Ngozi or CERT/102"
              autoComplete="off"
              spellCheck={false}
              maxLength={100}
              className={cn(inputClassName, "pl-11")}
            />
          </div>
        </Field>

        <Field id="student-programme" label="Programme" className="lg:col-span-2">
          <Select
            id="student-programme"
            value={search.programmeId ?? ""}
            onChange={(event) => update({ programmeId: event.target.value || null })}
          >
            <option value="">All programmes</option>
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="student-term" label="Entry term" className="lg:col-span-2">
          <Select
            id="student-term"
            value={search.entryTermId ?? ""}
            onChange={(event) => update({ entryTermId: event.target.value || null })}
          >
            <option value="">All terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="student-status" label="Status">
          <Select
            id="student-status"
            value={search.status ?? ""}
            onChange={(event) =>
              update({
                status: (event.target.value || null) as Search_["status"],
              })
            }
          >
            <option value="">Any status</option>
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STUDENT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="student-sort" label="Sort by">
          <Select
            id="student-sort"
            value={search.sort}
            onChange={(event) => update({ sort: event.target.value as StudentSort })}
          >
            {(Object.keys(STUDENT_SORTS) as StudentSort[]).map((sort) => (
              <option key={sort} value={sort}>
                {STUDENT_SORTS[sort]}
              </option>
            ))}
          </Select>
        </Field>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary" aria-live="polite">
          {busy
            ? "Searching…"
            : `${results.total} student${results.total === 1 ? "" : "s"}${filtered ? " found" : ""}`}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => update({ ...DEFAULT_STUDENT_SEARCH, sort: search.sort })}
            className="text-sm font-semibold text-accent-strong hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <DataTable
        caption="Students"
        columns={columns}
        rows={results.rows}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/students/${row.id}`}
        sort={{
          key: search.sort,
          direction: search.sort === "newest" ? "descending" : "ascending",
          onSort: (key) => update({ sort: key as StudentSort }),
        }}
        paging={{
          page: search.page,
          pageCount: pages,
          total: results.total,
          onPage: (page) => update({ page }),
        }}
        busy={busy}
        empty={
          filtered
            ? "No students match. Check the spelling, or clear the search."
            : "No students yet. Admitted applicants become students when you enrol them."
        }
      />
    </div>
  );
}

export default StudentSearch;
