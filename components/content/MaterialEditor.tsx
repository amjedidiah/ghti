"use client";

import { useCallback, useState } from "react";

import ItemControls from "@/components/content/ItemControls";
import MaterialForm from "@/components/content/MaterialForm";
import { deleteMaterial, updateMaterial } from "@/lib/content/actions";
import { driveViewUrl } from "@/lib/links";
import type { Material } from "@/lib/queries/content";

/** Controls and the edit form for one material in the content editor. */
function MaterialEditor({
  material,
  driveFileId,
  lessons,
  isFirst,
  isLast,
}: {
  material: Material;
  /** Only for pre-filling the edit form; never shown as a link. */
  driveFileId: string;
  lessons: { id: string; title: string }[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  return (
    <div className="w-full space-y-3 sm:w-auto">
      <ItemControls
        table="materials"
        itemId={material.id}
        label={material.title}
        isFirst={isFirst}
        isLast={isLast}
        editing={editing}
        onEdit={() => setEditing((open) => !open)}
        onDelete={() => deleteMaterial(material.id)}
      />
      {editing && (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <MaterialForm
            action={updateMaterial.bind(null, material.id)}
            lessons={lessons}
            initial={{
              title: material.title,
              driveLink: driveViewUrl(material.kind, driveFileId),
              lessonId: material.lessonId ?? "",
            }}
            submitLabel="Save material"
            onSaved={close}
          />
        </div>
      )}
    </div>
  );
}

export default MaterialEditor;
