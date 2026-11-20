import AxeBuilder from "@axe-core/playwright";
import { test as base, type Page } from "@playwright/test";

import { authFile, type Role } from "./accounts";

// Shared fixtures: an axe builder preset to WCAG 2.1 A and AA, and pages
// signed in as each seeded role.

type Fixtures = {
  /** An axe builder for `target` (default: the test's `page`). */
  makeAxeBuilder: (target?: Page) => AxeBuilder;
  pageAs: (role: Role) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  makeAxeBuilder: async ({ page }, provide) => {
    await provide((target = page) =>
      new AxeBuilder({ page: target })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        // YouTube's own player document is third-party (no title or lang we can
        // set). Our <iframe> itself is still checked, e.g. for its title.
        .exclude('iframe[src*="youtube-nocookie.com"]'),
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

/** Axe violations as readable lines (rule, help, elements), for clear failures. */
export function describeViolations(results: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} — ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(", ")}`,
  );
}
