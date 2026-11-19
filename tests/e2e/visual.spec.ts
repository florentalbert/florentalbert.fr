// Visual regression: every route × mobile/desktop × light/dark (specs/00-principles.md Q-6).
// Runs in JS projects only (see playwright.config.ts). Update baselines deliberately with
// `npm run test:e2e:update`.
import { expect, test } from '@playwright/test';
import { pages } from './routes';

const viewports = {
	mobile: { width: 360, height: 800 },
	desktop: { width: 1440, height: 900 },
} as const;

for (const { name, path } of pages) {
	for (const [viewportName, viewport] of Object.entries(viewports)) {
		for (const colorScheme of ['light', 'dark'] as const) {
			test(`${name} (${path}) ${viewportName} ${colorScheme}`, async ({ page }) => {
				await page.setViewportSize(viewport);
				await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
				await page.goto(path);
				await page.mouse.move(0, 0);
				await expect(page).toHaveScreenshot(`${name}-${viewportName}-${colorScheme}.png`, {
					fullPage: true,
					// The copyright year changes with the build date.
					mask: [page.getByText(/© \d{4}/)],
					// Neutral gray instead of Playwright's default magenta, in line with the monochrome design.
					maskColor: '#808080',
				});
			});
		}
	}
}
