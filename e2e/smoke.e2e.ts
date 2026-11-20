import { describeViolations, expect, test } from "./support/fixtures";

// Each role lands in its own area and is kept out of the others.

test("each role reaches its own area only", async ({ pageAs }) => {
  const admin = await pageAs("admin");
  await admin.goto("/admin");
  await expect(admin.getByRole("heading", { level: 1 })).toContainText("Welcome");

  const lecturer = await pageAs("lecturer");
  await lecturer.goto("/admin");
  await expect(lecturer).toHaveURL(/\/teach/);

  const student = await pageAs("student");
  await student.goto("/teach");
  await expect(student).toHaveURL(/\/portal/);
});

test("the home page has no automatically detectable accessibility issues", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.goto("/");
  expect(describeViolations(await makeAxeBuilder().analyze())).toEqual([]);
});
