import { existsSync, statSync } from "node:fs";

import { expect, test as setup } from "@playwright/test";

import { ACCOUNTS, authFile, type Role } from "./support/accounts";

// Sign in once per seeded role and save the session for the other specs. A
// saved session younger than 45 minutes is reused (tokens last an hour), which
// also keeps repeated runs under Supabase's sign-in rate limit.

const HOME: Record<Role, RegExp> = { admin: /\/admin/, lecturer: /\/teach/, student: /\/portal/ };
const REUSE_FOR_MS = 45 * 60 * 1000;

function fresh(path: string): boolean {
  return existsSync(path) && Date.now() - statSync(path).mtimeMs < REUSE_FOR_MS;
}

for (const role of Object.keys(ACCOUNTS) as Role[]) {
  setup(`sign in as ${role}`, async ({ page }) => {
    if (fresh(authFile(role))) return;
    const { email, password } = ACCOUNTS[role];
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(HOME[role]);
    await page.context().storageState({ path: authFile(role) });
  });
}
