import { ACCOUNTS } from "./support/accounts";
import { expect, test } from "./support/fixtures";
import { latestEmail } from "./support/mailpit";

// Step 3.1: lecturers see only the courses they teach; admins assign them.

test("a lecturer sees their course and its class list", async ({ pageAs }) => {
  const page = await pageAs("lecturer");
  await page.goto("/teach");
  await page.getByRole("link", { name: /BIB 101/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("BIB 101");
  await page.getByRole("link", { name: "Students" }).click();
  await expect(page.getByText("Chidi Eze")).toBeVisible();
  await expect(page.getByText("GHTI/2026/CERT/102")).toBeVisible();
});

test("an admin assigns a lecturer, who is emailed and sees the course", async ({ pageAs }) => {
  const admin = await pageAs("admin");
  await admin.goto("/admin/grades");
  const termId = new URL(
    (await admin
      .getByRole("navigation", { name: "Term" })
      .locator('a[aria-current="page"]')
      .getAttribute("href"))!,
    "http://x",
  ).searchParams.get("term");
  const offeringHref = await admin.getByRole("link", { name: /THE 101/ }).getAttribute("href");
  const offeringId = offeringHref!.split("/").pop();

  // A lecturer cannot open a course they do not teach (streamed, so the not-found
  // page arrives with status 200 but nothing of the course).
  const lecturer = await pageAs("lecturer");
  await lecturer.goto(`/teach/${offeringId}`);
  await expect(lecturer.getByRole("heading", { level: 1 })).toHaveText(/couldn.t find that page/);
  await expect(lecturer.getByText("THE 101")).toHaveCount(0);

  const since = new Date();
  await admin.goto(`/admin/offerings/${termId}/${offeringId}`);
  await admin
    .getByLabel("Lecturer", { exact: true })
    .selectOption({ label: "Rev. Local Lecturer" });
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("status")).toContainText("Lecturer assigned");

  const email = await latestEmail(ACCOUNTS.lecturer.email, { since });
  expect(email.subject).toContain("THE 101");

  await lecturer.goto("/teach");
  await expect(lecturer.getByRole("link", { name: /THE 101/ })).toBeVisible();

  // Put things back so the test can run again.
  await admin.getByLabel("Lecturer", { exact: true }).selectOption({ label: "No lecturer" });
  await admin.getByRole("button", { name: "Save" }).click();
  await expect(admin.getByRole("status")).toContainText("Lecturer removed");
});
