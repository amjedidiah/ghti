import { Text } from "@react-email/components";

import EmailLayout, { paragraph, strong } from "@/emails/EmailLayout";

export type ContactMessageProps = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function contactMessageSubject(name: string): string {
  return `Website message from ${name}`;
}

/** To the GHTI office. Replying answers the sender (reply-to is their address). */
function ContactMessage({ name, email, phone, message }: ContactMessageProps) {
  return (
    <EmailLayout
      preview={message.slice(0, 120)}
      heading="New message from the website"
      footnote="Reply to this email to answer the sender directly."
    >
      <Text style={paragraph}>
        <strong style={strong}>From:</strong> {name}
        <br />
        <strong style={strong}>Email:</strong> {email}
        {phone ? (
          <>
            <br />
            <strong style={strong}>Phone:</strong> {phone}
          </>
        ) : null}
      </Text>
      <Text style={{ ...paragraph, whiteSpace: "pre-line", color: "#15261d" }}>{message}</Text>
    </EmailLayout>
  );
}

export default ContactMessage;
