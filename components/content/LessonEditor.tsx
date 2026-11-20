"use client";

import { PlayCircle } from "lucide-react";
import { useCallback, useState } from "react";

import ItemControls from "@/components/content/ItemControls";
import LessonForm from "@/components/content/LessonForm";
import { deleteLesson, updateLesson } from "@/lib/content/actions";
import type { Lesson } from "@/lib/queries/content";

/** One lesson in the content editor: summary, controls and its edit form. */
function LessonEditor({
  lesson,
  number,
  isFirst,
  isLast,
}: {
  lesson: Lesson;
  number: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-primary">
            <span className="text-secondary tabular-nums">{number}.</span> {lesson.title}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-secondary">
            {lesson.youtubeId && (
              <span className="inline-flex items-center gap-1">
                <PlayCircle className="size-4" aria-hidden /> Video
              </span>
            )}
            <span>
              {lesson.materials.length} material{lesson.materials.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <ItemControls
          table="lessons"
          itemId={lesson.id}
          label={lesson.title}
          isFirst={isFirst}
          isLast={isLast}
          editing={editing}
          onEdit={() => setEditing((open) => !open)}
          onDelete={() => deleteLesson(lesson.id)}
        />
      </div>
      {editing && (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <LessonForm
            action={updateLesson.bind(null, lesson.id)}
            initial={{
              title: lesson.title,
              body: lesson.body,
              youtubeLink: lesson.youtubeId ? `https://youtu.be/${lesson.youtubeId}` : "",
            }}
            submitLabel="Save lesson"
            onSaved={close}
          />
        </div>
      )}
    </li>
  );
}

export default LessonEditor;
