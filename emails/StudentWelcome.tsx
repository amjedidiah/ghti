import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type StudentWelcomeProps = {
  name: string;
  programme: string;
  matricNo: string;
  siteUrl: string;
};

export const studentWelcomeSubject = "Welcome to GHTI: your student record is ready";

function StudentWelcome({ name, programme, matricNo, siteUrl }: StudentWelcomeProps) {
  return (
    <EmailLayout
      preview={`Your matric number is ${matricNo}.`}
      heading="Welcome to GHTI"
      action={{ label: "Open the student portal", href: `${siteUrl}/portal` }}
      footnote="Forgotten your password? Use “Forgot password” on the sign-in page."
    >
      <Text style={paragraph}>Dear {name || "student"},</Text>
      <Text style={paragraph}>
        You are now a student of Great Harvest Theological Institute, on the{" "}
        <strong style={strong}>{programme}</strong> programme.
      </Text>
      <Text style={paragraph}>
        Your matric number is <strong style={strong}>{matricNo}</strong>. Keep it for your records.
      </Text>
      <Text style={paragraph}>
        Sign in with the same email and password you used to apply. The student portal shows your
        record, your courses and, once published, your results.
      </Text>
    </EmailLayout>
  );
}

export default StudentWelcome;
