import { Panel } from "@/components/applications/ApplicationDetails";
import ContentHelp from "@/components/content/ContentHelp";
import LessonEditor from "@/components/content/LessonEditor";
import LessonForm from "@/components/content/LessonForm";
import MaterialEditor from "@/components/content/MaterialEditor";
import MaterialForm from "@/components/content/MaterialForm";
import MaterialList from "@/components/content/MaterialList";
import { createLesson, createMaterial } from "@/lib/content/actions";
import type { CourseContent } from "@/lib/queries/content";

/**
 * Lessons and materials of one course, for its lecturer (/teach) or an admin.
 * Content belongs to the course, so it carries over to the next term's class.
 */
function CourseContentEditor({ courseId, content }: { courseId: string; content: CourseContent }) {
  const lessons = content.lessons.map(({ id, title }) => ({ id, title }));
  const lessonTitle = new Map(lessons.map((lesson) => [lesson.id, lesson.title]));
  const materials = content.allMaterials;

  return (
    <div className="space-y-6">
      <ContentHelp />

      <Panel title="Lessons">
        {content.lessons.length === 0 ? (
          <p className="text-sm text-secondary">
            No lessons yet. Add the first below: a title, an optional video and notes.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {content.lessons.map((lesson, index) => (
              <LessonEditor
                key={lesson.id}
                lesson={lesson}
                number={index + 1}
                isFirst={index === 0}
                isLast={index === content.lessons.length - 1}
              />
            ))}
          </ol>
        )}
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-4 font-semibold text-primary">Add a lesson</h3>
          <LessonForm action={createLesson.bind(null, courseId)} submitLabel="Add lesson" />
        </div>
      </Panel>

      <Panel title="Materials">
        {materials.length === 0 ? (
          <p className="text-sm text-secondary">
            No materials yet. Add slides, handouts or readings from Google Drive below.
          </p>
        ) : (
          <MaterialList
            materials={materials}
            describe={(material) =>
              material.lessonId ? (lessonTitle.get(material.lessonId) ?? "Lesson") : "Whole course"
            }
            actions={(material, index) => (
              <MaterialEditor
                material={material}
                driveFileId={material.driveFileId ?? ""}
                lessons={lessons}
                isFirst={index === 0}
                isLast={index === materials.length - 1}
              />
            )}
          />
        )}
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-4 font-semibold text-primary">Add a material</h3>
          <MaterialForm
            action={createMaterial.bind(null, courseId)}
            lessons={lessons}
            submitLabel="Add material"
          />
        </div>
      </Panel>
    </div>
  );
}

export default CourseContentEditor;
