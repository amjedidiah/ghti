import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type ResultsPublishedProps = {
  name: string;
  term: string;
  siteUrl: string;
};

export function resultsPublishedSubject(term: string): string {
  return `Your GHTI results for ${term} are out`;
}

/** No grades in the email: students see them only after signing in. */
function ResultsPublished({ name, term, siteUrl }: ResultsPublishedProps) {
  return (
    <EmailLayout
      preview={`Results for ${term} are now in the student portal.`}
      heading="Your results are out"
      action={{ label: "See my results", href: `${siteUrl}/portal/results` }}
    >
      <Text style={paragraph}>Dear {name || "student"},</Text>
      <Text style={paragraph}>
        Results for <strong style={strong}>{term}</strong> have been published. Sign in to the
        student portal to see your grades, your GPA for the term and your CGPA.
      </Text>
    </EmailLayout>
  );
}

export default ResultsPublished;
