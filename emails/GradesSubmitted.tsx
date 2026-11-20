import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type GradesSubmittedProps = {
  lecturer: string;
  course: string;
  term: string;
  count: number;
  offeringId: string;
  siteUrl: string;
};

export function gradesSubmittedSubject(course: string): string {
  return `Grades for ${course} are waiting for approval`;
}

/** To the office. Counts only: no names or scores in the email. */
function GradesSubmitted({
  lecturer,
  course,
  term,
  count,
  offeringId,
  siteUrl,
}: GradesSubmittedProps) {
  const grades = `${count} grade${count === 1 ? "" : "s"}`;
  return (
    <EmailLayout
      preview={`${grades} for ${course}, ${term}`}
      heading="Grades waiting for approval"
      action={{ label: "Review the grade sheet", href: `${siteUrl}/admin/grades/${offeringId}` }}
    >
      <Text style={paragraph}>
        {lecturer || "The lecturer"} has submitted <strong style={strong}>{grades}</strong> for{" "}
        <strong style={strong}>{course}</strong> in {term}.
      </Text>
      <Text style={paragraph}>
        Check them, then publish them to students, or return them to the lecturer with a note.
      </Text>
    </EmailLayout>
  );
}

export default GradesSubmitted;
