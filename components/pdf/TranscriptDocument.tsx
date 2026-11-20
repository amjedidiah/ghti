import "server-only";

import { join } from "node:path";

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Transcript } from "@/lib/transcript";

// The unofficial transcript PDF (Stage 3, step 3.4), generated on demand and
// never stored. Colours mirror the site's palette; fonts are the site's own
// (static WOFF files in assets/fonts, as react-pdf cannot read WOFF2).

const fonts = (file: string) => join(process.cwd(), "assets/fonts", file);
Font.register({
  family: "Inter",
  fonts: [
    { src: fonts("inter-latin-400-normal.woff"), fontWeight: 400 },
    { src: fonts("inter-latin-600-normal.woff"), fontWeight: 600 },
  ],
});
Font.register({
  family: "Playfair Display",
  fonts: [{ src: fonts("playfair-display-latin-700-normal.woff"), fontWeight: 700 }],
});
// Never split words with hyphens.
Font.registerHyphenationCallback((word) => [word]);

const CREST = join(process.cwd(), "assets/images/ghti-crest.png");

const colors = {
  ink: "#15261d",
  secondary: "#4a5a51",
  border: "#e7dfd1",
  muted: "#f5efe4",
  brand: "#0e5530",
  gold: "#b07d10",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: 44,
    fontFamily: "Inter",
    fontSize: 9.5,
    color: colors.ink,
    lineHeight: 1.35,
  },
  watermark: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Playfair Display",
    fontSize: 92,
    color: colors.brand,
    opacity: 0.06,
    transform: "rotate(-35deg)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
    paddingBottom: 12,
  },
  crest: { width: 50, height: 60, marginRight: 14 },
  institute: { fontFamily: "Playfair Display", fontSize: 17, lineHeight: 1.2, color: colors.brand },
  ministry: { fontSize: 9, lineHeight: 1.3, color: colors.secondary, marginTop: 3 },
  title: {
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.gold,
    marginTop: 6,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.muted,
    borderRadius: 4,
  },
  detail: { width: "50%", marginBottom: 6 },
  label: { fontSize: 8, color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.6 },
  value: { fontWeight: 600, fontSize: 10, marginTop: 1 },
  term: { marginTop: 18 },
  termHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  termTitle: { fontFamily: "Playfair Display", fontSize: 12, lineHeight: 1.2 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  head: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingVertical: 4,
    fontWeight: 600,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.secondary,
  },
  code: { width: "14%" },
  courseTitle: { width: "46%", paddingRight: 6 },
  number: { width: "10%", textAlign: "right" },
  summary: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: colors.brand,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cgpa: { fontFamily: "Playfair Display", fontSize: 16, lineHeight: 1.2, color: colors.brand },
  empty: { marginTop: 24, color: colors.secondary },
  // No page numbers: react-pdf's render-callback text (needed for "Page x of y")
  // comes out invisible next to the embedded fonts here, and a transcript is
  // one or two pages with every term labelled.
  footerNote: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    fontSize: 7.5,
    lineHeight: 1.35,
    color: colors.secondary,
  },
  footerRule: {
    position: "absolute",
    bottom: 50,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
});

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );
}

function TranscriptDocument({ transcript }: { transcript: Transcript }) {
  const { student, terms } = transcript;
  return (
    <Document
      title="Unofficial transcript"
      author="Great Harvest Theological Institute"
      subject="Unofficial transcript of published results"
      creator="GHTI student portal"
      producer="GHTI student portal"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark} fixed>
          UNOFFICIAL
        </Text>
        <View style={styles.footerRule} fixed />
        <Text style={styles.footerNote} fixed>
          Unofficial transcript of published results, printed from the GHTI student portal. It is
          not an official record: request an official transcript from the registrar.
        </Text>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={CREST} style={styles.crest} />
          <View>
            <Text style={styles.institute}>Great Harvest Theological Institute</Text>
            <Text style={styles.ministry}>A Charismatic Renewal Ministries institution</Text>
            <Text style={styles.title}>UNOFFICIAL TRANSCRIPT</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Detail label="Name" value={student.name} />
          <Detail label="Matric number" value={student.matricNo} />
          <Detail label="Programme" value={student.programme} />
          <Detail label="Entry term" value={student.entryTerm} />
          <Detail label="Status" value={student.status} />
          <Detail label="Generated" value={transcript.generatedOn} />
        </View>

        {terms.length === 0 ? (
          <Text style={styles.empty}>No results have been published yet.</Text>
        ) : (
          terms.map((term) => (
            <View key={term.label} style={styles.term} wrap={false}>
              <View style={styles.termHeader}>
                <Text style={styles.termTitle}>{term.label}</Text>
                <Text>
                  GPA <Text style={{ fontWeight: 600 }}>{term.gpa}</Text>
                </Text>
              </View>
              <View style={styles.head}>
                <Text style={styles.code}>Code</Text>
                <Text style={styles.courseTitle}>Course</Text>
                <Text style={styles.number}>CU</Text>
                <Text style={styles.number}>Total</Text>
                <Text style={styles.number}>Grade</Text>
                <Text style={styles.number}>Points</Text>
              </View>
              {term.courses.map((course) => (
                <View key={course.code} style={styles.row}>
                  <Text style={[styles.code, { fontWeight: 600 }]}>{course.code}</Text>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.number}>{course.creditUnits}</Text>
                  <Text style={styles.number}>{course.total}</Text>
                  <Text style={[styles.number, { fontWeight: 600 }]}>{course.letter}</Text>
                  <Text style={styles.number}>{course.gradePoint}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        {terms.length > 0 && (
          <View style={styles.summary} wrap={false}>
            <View>
              <Text style={styles.label}>Cumulative GPA</Text>
              <Text style={styles.cgpa}>{transcript.cgpa}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.label}>Credit units counted</Text>
              <Text style={[styles.value, { fontSize: 12 }]}>{transcript.unitsCounted}</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

export default TranscriptDocument;
