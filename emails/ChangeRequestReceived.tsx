import { Text } from "@react-email/components";

import EmailLayout, { paragraph } from "@/emails/EmailLayout";

export type ChangeRequestReceivedProps = { studentId: string; siteUrl: string };

export const changeRequestReceivedSubject = "A student asked for a change to their record";

/** To the office. No name or request text: they are in the student's file. */
function ChangeRequestReceived({ studentId, siteUrl }: ChangeRequestReceivedProps) {
  return (
    <EmailLayout
      preview="A change request is waiting in the student's file."
      heading="A change request is waiting"
      action={{ label: "Open the student file", href: `${siteUrl}/admin/students/${studentId}` }}
    >
      <Text style={paragraph}>
        A student has asked for a correction to their record. The request is in their file, under
        Change requests. Resolve it with a note saying what was done; the student sees it in their
        portal.
      </Text>
    </EmailLayout>
  );
}

export default ChangeRequestReceived;
