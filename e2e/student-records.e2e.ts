import { describeViolations, expect, test } from "./support/fixtures";
import { latestEmail } from "./support/mailpit";

// Step 3.5: admins add documents to a student's file, and students ask for
// corrections that admins resolve. Uses the seeded student Chidi; the upload
// is removed and the request resolved, so the tests can run again.

const CHIDI = "/admin/students/00000000-0000-0000-0000-0000000005a1";
const OFFICE = "office@example.test"; // EMAIL_TO in .env.local
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n", "utf8");

test("an admin adds a document to a student's file, then removes it", async ({
  pageAs,
  makeAxeBuilder,
}) => {
  const admin = await pageAs("admin");
  await admin.goto(CHIDI);
  const documents = admin.getByRole("region", { name: "Added to this file" });
  await expect(documents.getByText("None yet.")).toBeVisible();

  await admin.getByLabel("Add a document: what is it?").selectOption({ label: "Other document" });
  await admin.getByLabel("File", { exact: true }).setInputFiles({
    name: "letter-from-the-office.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  });
  await expect(documents.getByText(/letter-from-the-office\.pdf/)).toBeVisible();
  await expect(admin.getByText("Added a document: Other document.").first()).toBeVisible();
  expect(describeViolations(await makeAxeBuilder(admin).analyze())).toEqual([]);

  await documents.getByRole("button", { name: "Delete Other document" }).click();
  await documents.getByRole("button", { name: "Delete Other document" }).click();
  await expect(documents.getByText("None yet.")).toBeVisible();
  await expect(admin.getByText("Removed a document: Other document.").first()).toBeVisible();
});

test("a student asks for a correction; the office resolves it with a note", async ({
  pageAs,
  makeAxeBuilder,
}) => {
  const request = `My middle name is spelt Chukwuemeka (test ${Date.now()}).`;
  const note = "Corrected from the birth certificate.";

  const student = await pageAs("student");
  await student.goto("/portal/record");
  const since = new Date();
  await student.getByLabel("What should be corrected?").fill(request);
  await student.getByRole("button", { name: "Send request" }).click();
  await expect(student.getByRole("status")).toContainText("Sent");
  await expect(student.getByText(request)).toBeVisible();
  expect(describeViolations(await makeAxeBuilder(student).analyze())).toEqual([]);

  const email = await latestEmail(OFFICE, { since });
  expect(email.subject).toBe("A student asked for a change to their record");
  expect(email.text).not.toContain("Chukwuemeka");

  const admin = await pageAs("admin");
  await admin.goto(CHIDI);
  const item = admin.getByRole("listitem").filter({ hasText: request });
  await item.getByLabel("What was done?").fill(note);
  await item.getByRole("button", { name: "Resolve" }).click();
  await expect(item.getByText(`Registrar: ${note}`)).toBeVisible();
  await expect(admin.getByText(`Request: ${request}`)).toBeVisible();

  await student.reload();
  const mine = student.getByRole("listitem").filter({ hasText: request });
  await expect(mine.getByText("Resolved", { exact: true })).toBeVisible();
  await expect(mine.getByText(note)).toBeVisible();
});
