import { render, toPlainText } from "@react-email/components";
import { describe, expect, test } from "bun:test";

import ApplicationDecision, { applicationDecisionSubject } from "@/emails/ApplicationDecision";
import ApplicationSubmitted from "@/emails/ApplicationSubmitted";
import ResultsPublished, { resultsPublishedSubject } from "@/emails/ResultsPublished";
import StudentWelcome from "@/emails/StudentWelcome";

const siteUrl = "https://ghti.example.test";

async function text(element: React.ReactElement) {
  const html = await render(element);
  return { html, text: toPlainText(html) };
}

describe("email templates", () => {
  test("application submitted names the programme and intake and links to the status page", async () => {
    const { html, text: plain } = await text(
      <ApplicationSubmitted
        name="Ada Obi"
        programme="Certificate in Theology"
        intake="First semester, 2026/2027"
        siteUrl={siteUrl}
      />,
    );
    expect(plain).toContain("Dear Ada Obi");
    expect(plain).toContain("Certificate in Theology");
    expect(plain).toContain("First semester, 2026/2027");
    expect(html).toContain(`${siteUrl}/apply/status`);
  });

  test("admitted and rejected decisions read differently", async () => {
    const admitted = await text(
      <ApplicationDecision name="Ada" programme="Diploma" decision="admitted" siteUrl={siteUrl} />,
    );
    const rejected = await text(
      <ApplicationDecision name="Ada" programme="Diploma" decision="rejected" siteUrl={siteUrl} />,
    );
    expect(admitted.text).toContain("offer you admission");
    expect(rejected.text).toContain("unable to offer you a place");
    expect(applicationDecisionSubject("admitted")).not.toBe(applicationDecisionSubject("rejected"));
  });

  test("welcome carries the matric number and links to the portal", async () => {
    const { html, text: plain } = await text(
      <StudentWelcome name="Ada" programme="Diploma" matricNo="GHTI/2026/001" siteUrl={siteUrl} />,
    );
    expect(plain).toContain("GHTI/2026/001");
    expect(html).toContain(`${siteUrl}/portal`);
  });

  test("results email names the term but carries no grades", async () => {
    const { html, text: plain } = await text(
      <ResultsPublished name="Ada" term="First semester, 2026/2027" siteUrl={siteUrl} />,
    );
    expect(plain).toContain("First semester, 2026/2027");
    expect(html).toContain(`${siteUrl}/portal/results`);
    expect(resultsPublishedSubject("First semester, 2026/2027")).toContain("First semester");
  });

  test("a missing name falls back to a greeting", async () => {
    const { text: plain } = await text(<ResultsPublished name="" term="Term" siteUrl={siteUrl} />);
    expect(plain).toContain("Dear student");
  });
});
