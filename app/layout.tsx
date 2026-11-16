import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { site } from "@/lib/site";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// Canonical site URL; Vercel preview deployments fall back to their own URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.fullName ? `${site.fullName} (${site.name})` : site.name,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  // The image comes from app/opengraph-image.tsx; pages inherit these fields.
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: site.fullName ?? site.name,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0e5530",
};

function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-bg font-sans text-primary antialiased">{children}</body>
    </html>
  );
}

export default RootLayout;
