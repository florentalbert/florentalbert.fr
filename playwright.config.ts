import { defineConfig, devices } from '@playwright/test';

// E2E suite against the production build served by `astro preview` (run `npm run build` first;
// `npm run verify` does it). See specs/00-principles.md for what each spec enforces.
const port = 4321;
const visualSpec = /visual\.spec\.ts/;

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: true,
	reporter: [['list'], ['html', { open: 'never' }]],
	snapshotPathTemplate:
		'{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
	expect: {
		toHaveScreenshot: {
			maxDiffPixels: 0,
			threshold: 0.02,
			animations: 'disabled',
			caret: 'hide',
			scale: 'css',
		},
	},
	use: {
		baseURL: `http://localhost:${port}`,
		reducedMotion: 'reduce',
		trace: 'retain-on-failure',
	},
	projects: [
		// Visual baselines are kept for Firefox only (specs/10-architecture.md, ADR-011).
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: visualSpec },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
	],
	webServer: {
		// Foreground server owned by Playwright. `--ignore-lock` stops Astro from auto-backgrounding
		// the server when it detects an AI agent, which would orphan it and fail the run.
		command: `./node_modules/.bin/astro preview --port ${port} --ignore-lock`,
		url: `http://localhost:${port}/`,
		// Never reuse a running server: it could be `astro dev` instead of the production build.
		reuseExistingServer: false,
	},
});
