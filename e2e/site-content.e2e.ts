import { describeViolations, expect, test } from "./support/fixtures";

// Step 3.5: admins edit the public text in /admin/content; saving shows it on
// the public pages at once, and clearing it brings the placeholder back.
// Uses office hours, which the seed leaves empty, and empties it again.

const HOURS = "Monday to Friday, 9am to 4pm (test)";

test("an admin fills in the office hours, then clears them again", async ({
  pageAs,
  page,
  makeAxeBuilder,
}) => {
  const admin = await pageAs("admin");
  await admin.goto("/admin/content");
  expect(describeViolations(await makeAxeBuilder(admin).analyze())).toEqual([]);

  // The text GHTI has already sent is there to edit.
  await expect(admin.getByLabel("Mission statement")).toHaveValue(/To equip leaders/);

  const hours = admin.getByLabel("Office hours");
  const form = admin.locator("form").filter({ has: hours });
  await hours.fill(HOURS);
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByRole("status")).toContainText("Saved");

  await page.goto("/contact");
  await expect(page.getByText(HOURS)).toBeVisible();

  await hours.fill("");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByRole("status")).toContainText("Cleared");

  await page.goto("/contact");
  await expect(page.getByText(HOURS)).toHaveCount(0);
  await expect(page.getByText(/Waiting for GHTI:.*office hours/)).toBeVisible();
});

test("the mission GHTI sent shows on the home page from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/To equip leaders with relevant training/)).toBeVisible();
});
