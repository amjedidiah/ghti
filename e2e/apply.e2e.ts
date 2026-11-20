import type { Page } from "@playwright/test";

import { describeViolations, expect, test } from "./support/fixtures";

// Step 3.5: the application asks the paper form's questions in steps, saves
// as the applicant moves on, keeps the step in the URL, and on submit opens
// the first step with a problem. Runs as the seeded draft applicant and never
// completes a submit (no documents), so it can run again.

async function next(page: Page, step: number) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`step=${step}$`));
  await expect(page.locator('[aria-current="step"]')).toContainText(`${step}`);
}

test("an applicant answers the steps, comes back to them, and is sent to what is missing", async ({
  pageAs,
  makeAxeBuilder,
}) => {
  test.setTimeout(120_000);
  const page = await pageAs("applicant");
  await page.goto("/apply?step=1");

  // 1. Programme
  await expect(page.getByRole("heading", { name: /Programme/ })).toBeVisible();
  expect(describeViolations(await makeAxeBuilder(page).analyze())).toEqual([]);
  await page.getByLabel("Programme applied for").selectOption({ index: 1 });
  await page.getByLabel("Intake").selectOption({ index: 1 });
  await next(page, 2);

  // 2. About you: Next refuses until the required answers are in.
  await page.getByLabel("Date of birth").fill("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Enter your date of birth.")).toBeVisible();
  await page.getByLabel("Date of birth").fill("1995-04-12");
  await page.getByRole("radio", { name: "Female", exact: true }).check();
  await page.getByLabel("Nationality").fill("Nigerian");
  await page.getByRole("radio", { name: "Married", exact: true }).check();
  await page.getByLabel("Phone number").fill("0803 123 4567");
  await next(page, 3);

  // 3. Addresses and next of kin
  await page.getByLabel("Current postal address").fill("P.O. Box 12, Owerri");
  await page.getByLabel("Permanent home address").fill("4 Fake Close, Owerri");
  await page.getByLabel("Full name").fill("Chika Nwosu");
  await page.getByLabel("Relationship to you").fill("Husband");
  await page.getByLabel("Phone number").fill("0805 000 0000");
  await next(page, 4);

  // Coming back to step 3 later finds the answers saved.
  await page.goto("/apply?step=3");
  await expect(page.getByLabel("Permanent home address")).toHaveValue("4 Fake Close, Owerri");
  await page.goto("/apply?step=4");
  await next(page, 5);

  // 5. Faith and church
  await page.getByRole("radio", { name: "Yes", exact: true }).check();
  await page.getByLabel("Name and location of your present church").fill("Fake Chapel, Owerri");
  await page.getByLabel("Pastor's name").fill("Pastor Fake Eze");
  await page.getByLabel("Pastor's phone number").fill("0803 000 0001");
  expect(describeViolations(await makeAxeBuilder(page).analyze())).toEqual([]);
  await next(page, 6);

  // 6. Education
  await page.getByLabel("Institution", { exact: true }).fill("Fake Secondary School");
  await page.getByLabel("Certificate obtained").fill("WASSCE");
  await next(page, 7);

  // 7. Referees
  for (const [index, name] of ["Rev. Fake One", "Mrs Fake Two"].entries()) {
    const referee = page.getByRole("group", { name: `Referee ${index + 1}` });
    await referee.getByLabel("Full name").fill(name);
    await referee.getByLabel("Phone number").fill(`0803 000 000${index + 2}`);
  }
  await next(page, 8);
  await next(page, 9);

  // 9. Review: the answers are there; submitting without documents opens Documents.
  await expect(page.getByText("Fake Chapel, Owerri")).toBeVisible();
  await page.getByLabel(/I agree to abide by the rules/).check();
  await page.getByLabel(/The information I have given is true/).check();
  expect(describeViolations(await makeAxeBuilder(page).analyze())).toEqual([]);
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page).toHaveURL(/step=8$/);
  await expect(page.getByText("Upload your certificates or results.")).toBeVisible();
  await expect(page.getByText("Upload a passport photograph.")).toBeVisible();
});
