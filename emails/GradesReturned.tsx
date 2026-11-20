import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type GradesReturnedProps = {
  name: string;
  course: string;
  term: string;
  note: string;
  count: number;
  offeringId: string;
  siteUrl: string;
};

export function gradesReturnedSubject(course: string): string {
  return `Grades for ${course} need another look`;
}

/** To the lecturer: the office's note, and where to change the grades. */
function GradesReturned({
  name,
  course,
  term,
  note,
  count,
  offeringId,
  siteUrl,
}: GradesReturnedProps) {
  const grades = `${count} grade${count === 1 ? "" : "s"}`;
  return (
    <EmailLayout
      preview={note.slice(0, 120)}
      heading="Grades returned to you"
      action={{ label: "Open the grade sheet", href: `${siteUrl}/teach/${offeringId}/grades` }}
    >
      <Text style={paragraph}>Dear {name || "lecturer"},</Text>
      <Text style={paragraph}>
        The office has returned <strong style={strong}>{grades}</strong> for{" "}
        <strong style={strong}>{course}</strong> ({term}) to you as drafts, with this note:
      </Text>
      <Text style={{ ...paragraph, whiteSpace: "pre-line", color: "#15261d" }}>{note}</Text>
      <Text style={paragraph}>
        Change what is needed, then submit the grades for approval again.
      </Text>
    </EmailLayout>
  );
}

export default GradesReturned;
