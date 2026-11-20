import AxeBuilder from "@axe-core/playwright";
import { test as base, type Page } from "@playwright/test";

import { authFile, type Role } from "./accounts";

// Shared fixtures: an axe builder preset to WCAG 2.1 A and AA, and pages
// signed in as each seeded role.

type Fixtures = {
  makeAxeBuilder: () => AxeBuilder;
  pageAs: (role: Role) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  makeAxeBuilder: async ({ page }, provide) => {
    await provide(() =>
      new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]),
    );
  },
  pageAs: async ({ browser }, provide) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await provide(async (role) => {
      const context = await browser.newContext({ storageState: authFile(role) });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect } from "@playwright/test";
