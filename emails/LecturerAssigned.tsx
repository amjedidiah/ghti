import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type LecturerAssignedProps = {
  name: string;
  course: string;
  term: string;
  siteUrl: string;
};

export function lecturerAssignedSubject(course: string): string {
  return `You are teaching ${course} at GHTI`;
}

function LecturerAssigned({ name, course, term, siteUrl }: LecturerAssignedProps) {
  return (
    <EmailLayout
      preview={`${course}, ${term}`}
      heading="A course for you"
      action={{ label: "Open my courses", href: `${siteUrl}/teach` }}
    >
      <Text style={paragraph}>Dear {name || "lecturer"},</Text>
      <Text style={paragraph}>
        You have been assigned to teach <strong style={strong}>{course}</strong> in{" "}
        <strong style={strong}>{term}</strong>.
      </Text>
      <Text style={paragraph}>
        Sign in to see your class list, share lessons and materials, and enter your students&apos;
        scores.
      </Text>
    </EmailLayout>
  );
}

export default LecturerAssigned;
