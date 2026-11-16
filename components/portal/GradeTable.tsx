import { formatGpa } from "@/lib/grades";
import type { TermResults } from "@/lib/results";

/** One term's results: course, credit units, total, grade and points, with the term GPA. */
function GradeTable({ term }: { term: TermResults }) {
  const headingId = `term-${term.termId}`;
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-4 sm:px-5">
        <h2 id={headingId} className="font-display text-xl font-bold text-primary">
          {term.label}
        </h2>
        <p className="text-sm text-secondary tabular-nums">
          GPA <span className="font-bold text-primary">{formatGpa(term.gpa)}</span>
          <span className="hidden sm:inline">
            {" "}
            · {term.unitsCounted} of {term.unitsRegistered} credit units graded
          </span>
        </p>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Results for {term.label}</caption>
        <thead className="bg-muted text-left text-xs font-semibold tracking-wide text-secondary uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5 sm:px-5">
              Course
            </th>
            <th scope="col" className="px-2 py-2.5 text-right">
              <abbr title="Credit units" className="no-underline">
                CU
              </abbr>
            </th>
            <th scope="col" className="px-2 py-2.5 text-right">
              Total
            </th>
            <th scope="col" className="px-2 py-2.5 text-center">
              Grade
            </th>
            <th scope="col" className="py-2.5 pr-4 pl-2 text-right sm:pr-5">
              <abbr title="Grade points" className="no-underline">
                Pts
              </abbr>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {term.courses.map((course) => (
            <tr key={course.code}>
              <th scope="row" className="px-4 py-3 text-left font-normal sm:px-5">
                <span className="block font-semibold text-primary tabular-nums">{course.code}</span>
                <span className="block text-secondary">{course.title}</span>
              </th>
              <td className="px-2 py-3 text-right text-primary tabular-nums">
                {course.creditUnits}
              </td>
              {course.published ? (
                <>
                  <td className="px-2 py-3 text-right text-primary tabular-nums">{course.total}</td>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-block min-w-7 rounded bg-muted px-1.5 py-0.5 font-bold text-primary">
                      {course.letter}
                    </span>
                  </td>
                  <td className="py-3 pr-4 pl-2 text-right text-primary tabular-nums sm:pr-5">
                    {course.gradePoint?.toFixed(2)}
                  </td>
                </>
              ) : (
                <td colSpan={3} className="py-3 pr-4 pl-2 text-right text-secondary sm:pr-5">
                  Awaiting result
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default GradeTable;
