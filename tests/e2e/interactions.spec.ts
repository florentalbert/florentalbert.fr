// HTML-only interactions (specs/00-principles.md AL-2, A11Y-8).
import { expect, test } from '@playwright/test';

test.describe('mobile', () => {
	test.use({ viewport: { width: 360, height: 800 } });

	test('menu opens with <details>, no script', async ({ page }) => {
		await page.goto('/');
		const menuNav = page.getByRole('navigation', { name: 'Navigation mobile' });
		await expect(menuNav).toBeHidden();
		await page.getByText('Menu', { exact: true }).click();
		await expect(menuNav).toBeVisible();
		await expect(menuNav.getByRole('link', { name: 'Projets' })).toBeVisible();
	});

	test('skip link reaches the main content', async ({ page }) => {
		await page.goto('/');
		await page.keyboard.press('Tab');
		const skip = page.getByRole('link', { name: 'Aller au contenu' });
		await expect(skip).toBeFocused();
		await expect(skip).toBeInViewport();
	});
});
