// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://florentalbert.fr',
	// See specs/10-architecture.md, ADR-004.
	trailingSlash: 'always',
	build: {
		format: 'directory',
		// Inline nothing: CSS stays in external files so the budget check can measure it.
		inlineStylesheets: 'never',
	},
	// Zero client JS (ADR-001): no prefetch script.
	prefetch: false,
	devToolbar: { enabled: false },
	integrations: [sitemap({ filter: (page) => !page.endsWith('/404/') })],
	vite: {
		plugins: [tailwindcss()],
	},
});
