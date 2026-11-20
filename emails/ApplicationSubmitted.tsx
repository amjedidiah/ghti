import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type ApplicationSubmittedProps = {
  name: string;
  programme: string;
  intake: string | null;
  siteUrl: string;
};

export const applicationSubmittedSubject = "We have received your GHTI application";

function ApplicationSubmitted({ name, programme, intake, siteUrl }: ApplicationSubmittedProps) {
  return (
    <EmailLayout
      preview={`Your application for ${programme} is in.`}
      heading="Application received"
      action={{ label: "See my application", href: `${siteUrl}/apply/status` }}
      footnote="You can no longer change your answers. If something is wrong, contact the GHTI office."
    >
      <Text style={paragraph}>Dear {name || "applicant"},</Text>
      <Text style={paragraph}>
        Thank you for applying to Great Harvest Theological Institute. We have received your
        application for <strong style={strong}>{programme}</strong>
        {intake ? <>, {intake}</> : null}.
      </Text>
      <Text style={paragraph}>
        The admissions team will review it and we will email you when a decision is made. You can
        follow its progress at any time by signing in.
      </Text>
    </EmailLayout>
  );
}

export default ApplicationSubmitted;
