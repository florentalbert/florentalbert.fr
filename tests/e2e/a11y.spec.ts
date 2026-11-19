// axe-core scan of every route in light and dark schemes (specs/00-principles.md A11Y-1, A11Y-2).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { pages } from './routes';

// WCAG A/AA up to 2.2, plus the AAA rules axe provides. AAA rules and `target-size` are disabled
// by default in axe-core; selecting them by tag enables them (verified when the suite was set up).
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'];

const scan = (page: Page) => new AxeBuilder({ page }).withTags(TAGS).analyze();

const summarize = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
	violations.map((v) => ({
		rule: v.id,
		impact: v.impact,
		targets: v.nodes.map((n) => n.target.join(' ')),
	}));

test.describe('axe', () => {
	for (const { name, path } of pages) {
		for (const colorScheme of ['light', 'dark'] as const) {
			test(`${name} (${path}) has no violations, ${colorScheme}`, async ({ page }) => {
				await page.emulateMedia({ colorScheme });
				await page.goto(path);
				const { violations } = await scan(page);
				expect(summarize(violations)).toEqual([]);
			});
		}
	}
});
