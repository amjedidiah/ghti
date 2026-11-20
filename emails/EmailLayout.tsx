import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

// Shared frame for GHTI's transactional emails. Same look as the auth emails
// in supabase/templates/: crest green band, dove-gold button, cream ground.
// Email clients ignore stylesheets, so styles are inline and fonts are safe
// system fonts.

const colors = {
  ground: "#fefbf6",
  card: "#ffffff",
  border: "#e7dfd1",
  brand: "#0e5530",
  gold: "#f2b632",
  ink: "#15261d",
  secondary: "#4a5a51",
};

const serif = 'Georgia, "Times New Roman", serif';
const sans = "Arial, Helvetica, sans-serif";

export const paragraph = {
  margin: "0 0 16px",
  fontSize: "16px",
  lineHeight: "1.5",
  color: colors.secondary,
};

export const strong = { color: colors.ink };

type EmailLayoutProps = {
  preview: string;
  heading: string;
  children: ReactNode;
  action?: { label: string; href: string };
  /** Small print under the button. */
  footnote?: string;
};

function EmailLayout({ preview, heading, children, action, footnote }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, background: colors.ground, fontFamily: sans }}>
        <Container style={{ maxWidth: "520px", padding: "24px 12px" }}>
          <Section
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Section
              style={{
                background: colors.brand,
                padding: "20px 28px",
                color: "#ffffff",
                fontFamily: serif,
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              GHTI
            </Section>
            <Section style={{ padding: "28px" }}>
              <Heading
                as="h1"
                style={{
                  margin: "0 0 12px",
                  fontFamily: serif,
                  fontSize: "22px",
                  color: colors.ink,
                }}
              >
                {heading}
              </Heading>
              {children}
              {action && (
                <Button
                  href={action.href}
                  style={{
                    display: "inline-block",
                    marginTop: "8px",
                    padding: "14px 24px",
                    borderRadius: "6px",
                    background: colors.gold,
                    color: colors.ink,
                    fontSize: "16px",
                    fontWeight: "bold",
                    textDecoration: "none",
                  }}
                >
                  {action.label}
                </Button>
              )}
              {footnote && (
                <Text
                  style={{
                    margin: "24px 0 0",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: colors.secondary,
                  }}
                >
                  {footnote}
                </Text>
              )}
            </Section>
            <Section
              style={{
                padding: "16px 28px",
                borderTop: `1px solid ${colors.border}`,
                fontSize: "12px",
                color: colors.secondary,
              }}
            >
              Great Harvest Theological Institute (GHTI), a Charismatic Renewal Ministries
              institution. God Bless You.
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default EmailLayout;
