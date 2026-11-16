import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

// Social preview for every page (WhatsApp, Facebook, X, LinkedIn, Slack).
// Built once at build time from the brand assets; colours mirror the
// palette in app/globals.css (crest green, dove gold, cream).

export const alt = `${site.fullName ?? site.name}: Certificate, Ordinary Diploma and Post Graduate Diploma in Theology`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const colors = {
  green: "#0e5530",
  greenNight: "#08301c",
  gold: "#f2b632",
  cream: "#fefbf6",
  onGreenMuted: "#cfe3d6",
};

async function OpengraphImage() {
  // Literal paths so the build traces only these files.
  const [playfair, interMedium, interSemiBold, mark] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/playfair-display-latin-700-normal.woff")),
    readFile(join(process.cwd(), "assets/fonts/inter-latin-500-normal.woff")),
    readFile(join(process.cwd(), "assets/fonts/inter-latin-600-normal.woff")),
    readFile(join(process.cwd(), "public/brand/ghti-mark.svg")),
  ]);
  const markSrc = `data:image/svg+xml;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(135deg, ${colors.green} 0%, ${colors.greenNight} 100%)`,
        color: colors.cream,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div
            style={{
              fontFamily: "Playfair Display",
              fontSize: 78,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            {site.fullName ?? site.name}
          </div>
          <div
            style={{
              width: 96,
              height: 6,
              borderRadius: 3,
              background: colors.gold,
              marginTop: 36,
            }}
          />
          <div
            style={{
              marginTop: 32,
              fontSize: 30,
              fontWeight: 500,
              lineHeight: 1.35,
              color: colors.onGreenMuted,
            }}
          >
            Certificate, Ordinary Diploma and Post Graduate Diploma in Theology
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 24,
              fontWeight: 600,
              color: colors.gold,
            }}
          >
            {`Apply online · ${site.ministry}`}
          </div>
        </div>
        <img src={markSrc} alt="" width={330} height={396} />
      </div>
      <div style={{ height: 12, background: colors.gold }} />
    </div>,
    {
      ...size,
      fonts: [
        { name: "Playfair Display", data: playfair, weight: 700, style: "normal" },
        { name: "Inter", data: interMedium, weight: 500, style: "normal" },
        { name: "Inter", data: interSemiBold, weight: 600, style: "normal" },
      ],
    },
  );
}

export default OpengraphImage;
