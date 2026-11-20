import LessonPlayer from "@/components/content/LessonPlayer";
import MaterialList from "@/components/content/MaterialList";
import type { CourseContent } from "@/lib/queries/content";

/** A course's lessons and materials, as students see them. */
function CourseContentView({ content }: { content: CourseContent }) {
  if (content.lessons.length === 0 && content.materials.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-secondary">
        Your lecturer has not added lessons or materials yet. Check back soon.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {content.lessons.length > 0 && (
        <ol className="space-y-6">
          {content.lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
            >
              <h2 className="font-display text-xl font-bold text-primary">
                <span className="text-secondary tabular-nums">{index + 1}.</span> {lesson.title}
              </h2>
              {lesson.youtubeId && (
                <LessonPlayer youtubeId={lesson.youtubeId} title={lesson.title} />
              )}
              {lesson.body && (
                <p className="leading-relaxed whitespace-pre-line text-secondary">{lesson.body}</p>
              )}
              {lesson.materials.length > 0 && <MaterialList materials={lesson.materials} />}
            </li>
          ))}
        </ol>
      )}
      {content.materials.length > 0 && (
        <section
          aria-labelledby="course-materials"
          className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
        >
          <h2 id="course-materials" className="font-display text-xl font-bold text-primary">
            Course materials
          </h2>
          <MaterialList materials={content.materials} />
        </section>
      )}
    </div>
  );
}

export default CourseContentView;
