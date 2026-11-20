import { ACCOUNTS } from "./support/accounts";
import { describeViolations, expect, test } from "./support/fixtures";
import { latestEmail } from "./support/mailpit";

// Step 3.3: a lecturer enters scores (here from a CSV) and submits them; the
// office is emailed, returns them with a note, and the lecturer sees it.
// Uses THE 101, where the seed leaves Ngozi's grade a draft (CA 20, no exam),
// and puts everything back at the end.

const OFFICE = "office@example.test"; // EMAIL_TO in .env.local
const NGOZI = "Ngozi Adeyemi";

test("a lecturer submits grades, and the office returns them with a note", async ({
  pageAs,
  makeAxeBuilder,
}) => {
  test.setTimeout(120_000);
  const admin = await pageAs("admin");
  await admin.goto("/admin/grades");
  const termId = new URL(
    (await admin
      .getByRole("navigation", { name: "Term" })
      .locator('a[aria-current="page"]')
      .getAttribute("href"))!,
    "http://x",
  ).searchParams.get("term");
  const offeringId = (await admin.getByRole("link", { name: /THE 101/ }).getAttribute("href"))!
    .split("/")
    .pop();

  // The admin assigns the lecturer to THE 101.
  await admin.goto(`/admin/offerings/${termId}/${offeringId}`);
  await admin
    .getByLabel("Lecturer", { exact: true })
    .selectOption({ label: "Rev. Local Lecturer" });
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("status")).toContainText("Lecturer assigned");

  try {
    // The lecturer imports the missing exam score from a CSV and submits.
    const lecturer = await pageAs("lecturer");
    await lecturer.goto(`/teach/${offeringId}/grades`);
    await expect(lecturer.getByLabel(`CA for ${NGOZI}`)).toHaveValue("20");
    await expect(lecturer.getByLabel("CA for Chidi Eze")).toHaveCount(0); // published: locked

    await lecturer.getByText("Import scores from a spreadsheet").click();
    await lecturer.getByLabel("CSV file").setInputFiles({
      name: "scores.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("matric,ca,exam\nGHTI/2026/CERT/102,,40\n"),
    });
    await expect(lecturer.getByText("1 student would change.")).toBeVisible();
    await lecturer.getByRole("button", { name: "Fill in 1 student" }).click();
    await expect(lecturer.getByLabel(`Exam for ${NGOZI}`)).toHaveValue("40");

    expect(describeViolations(await makeAxeBuilder(lecturer).analyze())).toEqual([]);

    const submittedAt = new Date();
    await lecturer.getByRole("button", { name: "Save and submit for approval" }).click();
    await expect(lecturer.getByRole("status")).toContainText("Submitted 1 for approval");
    await expect(lecturer.getByLabel(`Exam for ${NGOZI}`)).toHaveCount(0); // now locked
    const office = await latestEmail(OFFICE, { since: submittedAt });
    expect(office.subject).toContain("THE 101");

    // The office sees it waiting and returns it with a note.
    await admin.goto(`/admin/grades/${offeringId}`);
    await expect(admin.getByText("1 grade is waiting for approval")).toBeVisible();
    await admin.getByText("Return them to the lecturer", { exact: true }).click();
    const returnedAt = new Date();
    await admin
      .getByLabel("What should the lecturer look at?")
      .fill("Please check the exam score against the script.");
    await admin.getByRole("button", { name: "Return to the lecturer" }).click();
    // The panel goes (nothing is waiting now); the return shows in its place.
    await expect(admin.getByText("1 grade returned to the lecturer")).toBeVisible();

    const returned = await latestEmail(ACCOUNTS.lecturer.email, { since: returnedAt });
    expect(returned.subject).toContain("THE 101");
    expect(returned.text).toContain("Please check the exam score against the script.");

    // The lecturer sees the note, and the grade is a draft they can change again.
    await lecturer.reload();
    await expect(lecturer.getByText("The office returned 1 grade to you")).toBeVisible();
    await expect(
      lecturer.getByText("Please check the exam score against the script."),
    ).toBeVisible();
    await lecturer.getByLabel(`Exam for ${NGOZI}`).fill("");
    await lecturer.getByRole("button", { name: "Save draft" }).click();
    await expect(lecturer.getByRole("status")).toContainText("Saved 1 grade");
  } finally {
    // Put things back so the test can run again: the seed's draft (CA 20, no
    // exam), whatever step the test stopped at, and no lecturer.
    await admin.goto(`/admin/grades/${offeringId}`);
    await admin.getByLabel(`CA for ${NGOZI}`).fill("20");
    await admin.getByLabel(`Exam for ${NGOZI}`).fill("");
    await admin.getByRole("button", { name: "Save draft" }).click();
    await expect(admin.getByRole("status")).toContainText(/Saved|No changes/);
    await admin.goto(`/admin/offerings/${termId}/${offeringId}`);
    await admin.getByLabel("Lecturer", { exact: true }).selectOption({ label: "No lecturer" });
    await admin.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByRole("status")).toContainText("Lecturer removed");
  }
});
