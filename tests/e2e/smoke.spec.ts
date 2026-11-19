// Smoke tests on every route: status, SEO head, headings, internal links and assets
// (specs/00-principles.md A11Y-4, Q-5, Q-7; specs/20-content.md "SEO").
import { expect, test } from '@playwright/test';
import { pages, routes, SITE } from './routes';

for (const { name, path, status } of pages) {
	test.describe(`${name} (${path})`, () => {
		test('responds, has valid SEO head and one h1', async ({ page }) => {
			const response = await page.goto(path);
			expect(response?.status(), 'HTTP status').toBe(status);

			await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

			const title = await page.title();
			expect(title.length, `<title> "${title}"`).toBeGreaterThan(0);
			expect(title.length, `<title> "${title}" must be ≤ 60 characters`).toBeLessThanOrEqual(60);

			const description = await page.locator('meta[name="description"]').getAttribute('content');
			expect(description?.length ?? 0, 'meta description length').toBeGreaterThanOrEqual(50);
			expect(description?.length ?? 0, 'meta description length').toBeLessThanOrEqual(160);

			for (const property of ['og:title', 'og:description', 'og:type', 'og:image']) {
				await expect(page.locator(`meta[property="${property}"]`), property).toHaveAttribute(
					'content',
					/.+/,
				);
			}
			const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
			expect(ogImage, 'og:image must be absolute').toMatch(/^https:\/\//);

			if (status === 200) {
				await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
					'href',
					`${SITE}${path}`,
				);
				await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
					'content',
					`${SITE}${path}`,
				);
				await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
			} else {
				await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
				await expect(
					page.locator('link[rel="canonical"]'),
					'no canonical on noindex pages',
				).toHaveCount(0);
			}

			await expect(page.locator('h1'), 'exactly one <h1>').toHaveCount(1);
		});

		test('internal links and assets resolve', async ({ page, request }) => {
			await page.goto(path);
			const refs = await page
				.locator('a[href], link[href], img[src], img[srcset], source[srcset]')
				.evaluateAll((elements) =>
					elements.flatMap((el) => {
						const tag = el.tagName.toLowerCase();
						const single = el.getAttribute('href') ?? el.getAttribute('src');
						// srcset: comma-separated candidates, each "url [descriptor]".
						const candidates = (el.getAttribute('srcset') ?? '')
							.split(',')
							.map((candidate) => candidate.trim().split(/\s+/)[0])
							.filter(Boolean);
						return [...(single ? [single] : []), ...candidates].map((url) => ({ tag, url }));
					}),
				);
			const internal = refs.filter(({ url }) => url.startsWith('/') && !url.startsWith('//'));

			// Collect every problem, then fail once with the full list.
			const problems: string[] = [];
			for (const { tag, url: ref } of internal) {
				const url = new URL(ref, SITE);
				const isFile = /\.[a-z0-9]+$/i.test(url.pathname);
				if (tag === 'a' && !isFile && !url.pathname.endsWith('/')) {
					problems.push(`<a href="${ref}">: missing trailing slash`);
				}
				const response = await request.get(url.pathname);
				if (response.status() !== 200) {
					problems.push(`<${tag}> "${ref}": HTTP ${response.status()}`);
				} else if (url.hash) {
					const id = decodeURIComponent(url.hash.slice(1));
					if (!(await response.text()).includes(` id="${id}"`)) {
						problems.push(`<${tag}> "${ref}": no element with id="${id}"`);
					}
				}
			}
			expect(problems, 'broken internal references').toEqual([]);
		});
	});
}

test('titles are unique', async ({ page }) => {
	const titles = new Map<string, string>();
	for (const path of routes) {
		await page.goto(path);
		const title = await page.title();
		expect(
			titles.get(title),
			`"${title}" used by ${titles.get(title)} and ${path}`,
		).toBeUndefined();
		titles.set(title, path);
	}
});

test('sitemap lists every indexable route', async ({ request }) => {
	const index = await request.get('/sitemap-index.xml');
	expect(index.status()).toBe(200);
	const sitemapUrls = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const locs: string[] = [];
	for (const sitemapUrl of sitemapUrls) {
		const sitemap = await request.get(new URL(sitemapUrl).pathname);
		expect(sitemap.status()).toBe(200);
		locs.push(...[...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
	}
	expect(locs.sort()).toEqual(routes.map((path) => `${SITE}${path}`).sort());
});

test('robots.txt references the sitemap', async ({ request }) => {
	const robots = await request.get('/robots.txt');
	expect(robots.status()).toBe(200);
	expect(await robots.text()).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
});
