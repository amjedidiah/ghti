import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type ApplicationDecisionProps = {
  name: string;
  programme: string;
  decision: "admitted" | "rejected";
  siteUrl: string;
};

export function applicationDecisionSubject(decision: ApplicationDecisionProps["decision"]): string {
  return decision === "admitted"
    ? "Your GHTI application: you have been admitted"
    : "Your GHTI application: a decision has been made";
}

function ApplicationDecision({ name, programme, decision, siteUrl }: ApplicationDecisionProps) {
  const admitted = decision === "admitted";
  return (
    <EmailLayout
      preview={
        admitted
          ? `You have been admitted to ${programme}.`
          : `A decision has been made on your application for ${programme}.`
      }
      heading={admitted ? "Congratulations" : "A decision on your application"}
      action={{ label: "See the decision", href: `${siteUrl}/apply/status` }}
    >
      <Text style={paragraph}>Dear {name || "applicant"},</Text>
      {admitted ? (
        <>
          <Text style={paragraph}>
            We are glad to offer you admission to <strong style={strong}>{programme}</strong> at
            Great Harvest Theological Institute.
          </Text>
          <Text style={paragraph}>
            The registrar will now create your student record. We will email you your matric number
            and how to reach the student portal.
          </Text>
        </>
      ) : (
        <>
          <Text style={paragraph}>
            Thank you for your interest in <strong style={strong}>{programme}</strong>. After
            careful review, we are unable to offer you a place at this time.
          </Text>
          <Text style={paragraph}>
            Sign in to read the admissions team&apos;s note on your application.
          </Text>
        </>
      )}
    </EmailLayout>
  );
}

export default ApplicationDecision;
