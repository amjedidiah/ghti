import { ExternalLink, FileText, Presentation, Sheet } from "lucide-react";
import type { ReactNode } from "react";

import type { Material } from "@/lib/queries/content";

const ICONS = {
  file: FileText,
  document: FileText,
  presentation: Presentation,
  spreadsheet: Sheet,
} as const;

const KIND_LABELS = {
  file: "File",
  document: "Document",
  presentation: "Slides",
  spreadsheet: "Spreadsheet",
} as const;

/**
 * Course materials. Each opens through /materials/[id], which checks access
 * before redirecting to Google Drive: raw Drive links are never shown.
 * `actions` renders extra controls per item (the lecturer's editor).
 */
function MaterialList({
  materials,
  actions,
  describe,
}: {
  materials: Material[];
  actions?: (material: Material, index: number) => ReactNode;
  /** Extra detail after the kind, e.g. which lesson it belongs to. */
  describe?: (material: Material) => string;
}) {
  return (
    <ul className="divide-y divide-border">
      {materials.map((material, index) => {
        const Icon = ICONS[material.kind];
        return (
          <li key={material.id} className="flex flex-wrap items-center gap-3 py-3">
            <Icon className="size-5 shrink-0 text-accent-strong" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-primary">{material.title}</span>
              <span className="block text-xs text-secondary">
                {KIND_LABELS[material.kind]}
                {describe ? ` · ${describe(material)}` : ""}
              </span>
            </span>
            <a
              href={`/materials/${material.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
            >
              Open
              <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">{material.title} (opens in a new tab)</span>
            </a>
            {actions?.(material, index)}
          </li>
        );
      })}
    </ul>
  );
}

export default MaterialList;
