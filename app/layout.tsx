import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHTI",
  description:
    "GHTI, a Charismatic Renewal Ministries institution: Certificate, Diploma and Degree programmes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
