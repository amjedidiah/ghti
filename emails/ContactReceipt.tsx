import { Text } from "@react-email/components";

import EmailLayout, { paragraph } from "@/emails/EmailLayout";

export type ContactReceiptProps = {
  name: string;
  siteUrl: string;
};

export const contactReceiptSubject = "We have received your message";

/**
 * To the sender. It never repeats what they wrote: anyone can type any
 * address into the form, so this email must carry only our own words.
 */
function ContactReceipt({ name, siteUrl }: ContactReceiptProps) {
  return (
    <EmailLayout
      preview="Thank you for contacting Great Harvest Theological Institute."
      heading="Thank you for your message"
      action={{ label: "Visit the GHTI website", href: siteUrl }}
      footnote="Did not write to us? Someone may have typed your address by mistake. You can ignore this email."
    >
      <Text style={paragraph}>Dear {name || "friend"},</Text>
      <Text style={paragraph}>
        Thank you for contacting Great Harvest Theological Institute. The office has received your
        message and will reply as soon as it can.
      </Text>
    </EmailLayout>
  );
}

export default ContactReceipt;
