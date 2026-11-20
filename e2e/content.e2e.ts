import { describeViolations, expect, test } from "./support/fixtures";

// Step 3.2: lecturers add lessons and materials; students see them; Drive
// files open only through access-checked redirects.

const VIDEO = "https://youtu.be/M7lc1UVf-VE";
const FILE = "https://drive.google.com/file/d/1E2eTestDriveFileIdNotReal000001/view?usp=sharing";

test("a lecturer adds a lesson and a material, and the student sees them", async ({
  pageAs,
  makeAxeBuilder,
}) => {
  test.setTimeout(120_000); // a long journey across two roles
  const title = `E2E lesson ${Date.now()}`;
  const lecturer = await pageAs("lecturer");
  await lecturer.goto("/teach");
  await lecturer.getByRole("link", { name: /BIB 101/ }).click();
  await lecturer.getByRole("link", { name: "Content", exact: true }).click();
  await expect(lecturer.getByText("Week 1: How the Bible came to us").first()).toBeVisible();

  // The add-lesson form is the last one on the page.
  const addLesson = lecturer.locator("form").filter({ hasText: "Add lesson" });
  await addLesson.getByLabel("Title").fill(title);
  await addLesson.getByLabel(/YouTube video/).fill(VIDEO);
  await expect(addLesson.getByTitle(`Video: ${title}`)).toBeVisible();
  await addLesson.getByRole("button", { name: "Add lesson" }).click();
  await expect(lecturer.getByRole("status").filter({ hasText: "Lesson added." })).toBeVisible();
  await expect(lecturer.getByText(title).first()).toBeVisible();

  const addMaterial = lecturer.locator("form").filter({ hasText: "Add material" });
  await addMaterial.getByLabel("Title").fill(`${title} handout`);
  await addMaterial.getByLabel("Google Drive link").fill(FILE);
  await addMaterial.getByLabel(/Lesson/).selectOption({ label: title });
  await addMaterial.getByRole("button", { name: "Add material" }).click();
  await expect(lecturer.getByText(`${title} handout`).first()).toBeVisible();
  expect(describeViolations(await makeAxeBuilder(lecturer).analyze())).toEqual([]);

  const student = await pageAs("student");
  await student.goto("/portal/courses");
  await student.getByRole("link", { name: /BIB 101/ }).click();
  await expect(student.getByRole("heading", { name: new RegExp(title) })).toBeVisible();
  await expect(student.getByTitle(`Video: ${title}`)).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed\/M7lc1UVf-VE/,
  );
  const open = student.getByRole("link", { name: `Open ${title} handout (opens in a new tab)` });
  const href = await open.getAttribute("href");
  expect(href).toMatch(/^\/materials\//);
  // The page never contains the Drive link itself.
  expect(await student.content()).not.toContain("1E2eTestDriveFileIdNotReal000001");

  // The redirect: to Drive for the student, to sign-in for a visitor.
  const asStudent = await student.request.get(href!, { maxRedirects: 0 });
  expect(asStudent.status()).toBe(307);
  expect(asStudent.headers().location).toContain(
    "drive.google.com/file/d/1E2eTestDriveFileIdNotReal000001",
  );
  const visitor = await student.context().browser()!.newContext();
  const asVisitor = await visitor.request.get(`http://localhost:3000${href}`, { maxRedirects: 0 });
  expect(asVisitor.headers().location ?? "").toContain("/sign-in");
  await visitor.close();
  expect(describeViolations(await makeAxeBuilder(student).analyze())).toEqual([]);

  // Clean up: delete the lesson (its material stays, unattached), then the material.
  await lecturer.reload();
  const lesson = lecturer.getByRole("listitem").filter({ hasText: title }).first();
  await lesson.getByRole("button", { name: `Delete ${title}` }).click();
  await lesson.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(lecturer.getByText(`${title} handout`).first()).toBeVisible();
  const material = lecturer.getByRole("listitem").filter({ hasText: `${title} handout` });
  await material.getByRole("button", { name: `Delete ${title} handout` }).click();
  await material.getByRole("button", { name: `Delete ${title} handout` }).click();
  await expect(lecturer.getByText(`${title} handout`)).toHaveCount(0);
});

test("the programme page lists its lecture schedule, which opens through a redirect", async ({
  page,
}) => {
  await page.goto("/academics/certificate-in-theology");
  await expect(page.getByRole("heading", { name: "Lecture schedules" })).toBeVisible();
  const href = await page
    .getByRole("link", { name: "Open Lecture timetable (opens in a new tab)" })
    .getAttribute("href");
  const response = await page.request.get(href!, { maxRedirects: 0 });
  expect(response.headers().location).toContain("docs.google.com/document/d/");
});
