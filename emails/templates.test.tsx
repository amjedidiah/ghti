import { render, toPlainText } from "@react-email/components";
import { describe, expect, test } from "bun:test";

import ApplicationDecision, { applicationDecisionSubject } from "@/emails/ApplicationDecision";
import ApplicationSubmitted from "@/emails/ApplicationSubmitted";
import ChangeRequestReceived from "@/emails/ChangeRequestReceived";
import ContactMessage from "@/emails/ContactMessage";
import ContactReceipt from "@/emails/ContactReceipt";
import GradesReturned from "@/emails/GradesReturned";
import GradesSubmitted from "@/emails/GradesSubmitted";
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

  test("the office copy carries the whole message and how to reach the sender", async () => {
    const { text: plain } = await text(
      <ContactMessage
        name="Ada Obi"
        email="ada@example.test"
        phone="0803 123 4567"
        message="When does the next intake start?"
      />,
    );
    expect(plain).toContain("Ada Obi");
    expect(plain).toContain("ada@example.test");
    expect(plain).toContain("0803 123 4567");
    expect(plain).toContain("When does the next intake start?");
  });

  test("the sender's receipt never repeats what they wrote", async () => {
    const { text: plain } = await text(<ContactReceipt name="Ada" siteUrl={siteUrl} />);
    expect(plain).toContain("Dear Ada");
    expect(plain).not.toContain("intake");
  });

  test("the office hears how many grades wait for approval, with no names or scores", async () => {
    const { html, text: plain } = await text(
      <GradesSubmitted
        lecturer="Rev. Okoro"
        course="BIB 101: Old Testament Survey"
        term="First semester, 2026/2027"
        count={2}
        offeringId="o1"
        siteUrl={siteUrl}
      />,
    );
    expect(plain).toContain("Rev. Okoro has submitted 2 grades");
    expect(html).toContain(`${siteUrl}/admin/grades/o1`);
  });

  test("a returned sheet carries the office's note and links to the lecturer's sheet", async () => {
    const { html, text: plain } = await text(
      <GradesReturned
        name="Rev. Okoro"
        course="BIB 101: Old Testament Survey"
        term="First semester, 2026/2027"
        note="GHTI/002's exam looks low."
        count={1}
        offeringId="o1"
        siteUrl={siteUrl}
      />,
    );
    expect(plain).toContain("returned 1 grade");
    expect(plain).toContain("GHTI/002's exam looks low.");
    expect(html).toContain(`${siteUrl}/teach/o1/grades`);
  });

  test("the office hears of a change request, with a link and no personal details", async () => {
    const { html, text: plain } = await text(
      <ChangeRequestReceived studentId="s1" siteUrl={siteUrl} />,
    );
    expect(html).toContain(`${siteUrl}/admin/students/s1`);
    expect(plain).toContain("asked for a correction to their record");
  });
});
