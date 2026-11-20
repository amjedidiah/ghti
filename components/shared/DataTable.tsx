"use client";

import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// A table for admin lists: sortable columns, paging, and on phones a stacked
// card per row (tables do not fit 375px). Sorting, filtering and paging
// happen wherever the data comes from; this only draws it and reports clicks.

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Set to make the header a sort button for this key. */
  sortKey?: string;
  className?: string;
};

type DataTableProps<Row> = {
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Each row opens this page (the first column becomes the link). */
  rowHref?: (row: Row) => string;
  sort?: { key: string; direction: "ascending" | "descending"; onSort: (key: string) => void };
  paging?: { page: number; pageCount: number; total: number; onPage: (page: number) => void };
  empty: ReactNode;
  busy?: boolean;
};

function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  rowHref,
  sort,
  paging,
  empty,
  busy,
}: DataTableProps<Row>) {
  const [first, ...rest] = columns;

  function primary(row: Row) {
    const content = first.cell(row);
    return rowHref ? (
      <Link
        href={rowHref(row)}
        className="font-semibold text-primary underline-offset-4 after:absolute after:inset-0 hover:underline"
      >
        {content}
      </Link>
    ) : (
      <span className="font-semibold text-primary">{content}</span>
    );
  }

  return (
    <div className={cn("space-y-4 transition-opacity", busy && "opacity-60")} aria-busy={busy}>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
          {empty}
        </div>
      ) : (
        <>
          {/* Phones: one card per row. */}
          <ul className="space-y-3 sm:hidden" aria-label={caption}>
            {rows.map((row) => (
              <li
                key={rowKey(row)}
                className="relative rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div>{primary(row)}</div>
                <dl className="mt-2 space-y-1 text-sm">
                  {rest.map((column) => (
                    <div key={column.key} className="flex gap-2">
                      <dt className="shrink-0 text-secondary">{column.header}:</dt>
                      <dd className="min-w-0 text-primary">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          {/* Wider screens: a table. */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="border-b border-border bg-muted text-xs font-semibold tracking-wide text-secondary uppercase">
                <tr>
                  {columns.map((column) => {
                    const sortKey = column.sortKey;
                    const sorted = sort !== undefined && sortKey === sort.key;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={sorted ? sort.direction : undefined}
                        className={cn("px-4 py-3", column.className)}
                      >
                        {sort && sortKey ? (
                          <button
                            type="button"
                            onClick={() => sort.onSort(sortKey)}
                            className={cn(
                              "inline-flex items-center gap-1 uppercase hover:text-primary",
                              sorted && "text-primary",
                            )}
                          >
                            {column.header}
                            <ArrowDown
                              className={cn("size-3.5", !sorted && "opacity-0")}
                              aria-hidden
                            />
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={rowKey(row)} className="relative hover:bg-muted">
                    <td className={cn("px-4 py-3", first.className)}>{primary(row)}</td>
                    {rest.map((column) => (
                      <td
                        key={column.key}
                        className={cn("px-4 py-3 text-primary", column.className)}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {paging && paging.pageCount > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => paging.onPage(paging.page - 1)}
            disabled={paging.page <= 1 || busy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted disabled:opacity-50"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </button>
          <p className="text-sm text-secondary tabular-nums" aria-live="polite">
            Page {paging.page} of {paging.pageCount}
          </p>
          <button
            type="button"
            onClick={() => paging.onPage(paging.page + 1)}
            disabled={paging.page >= paging.pageCount || busy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted disabled:opacity-50"
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

export default DataTable;
