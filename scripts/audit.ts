// audit: Lighthouse on every indexable route (specs/00-principles.md, "Budgets").
// Not part of `npm run verify`: run with `npm run audit` (which builds first). Each route runs
// RUNS times; medians are asserted. Reports of the median runs go to .lighthouse/.
// Usage: node scripts/audit.ts (audits dist/, the directory `astro preview` serves)
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { LighthouseAuditor } from './audit/lighthouse-auditor.ts';
import { PreviewServer } from './audit/preview-server.ts';
import { SiteAudit } from './audit/route-audit.ts';
import { Thresholds } from './audit/thresholds.ts';
import { routeName } from './lib/build-output.ts';
import { CommandLine, ROOT } from './lib/command-line.ts';

const CHECK = 'audit';
const RUNS = 5;
const DEBUG_PORT = 9223;
const REPORT_DIR = join(ROOT, '.lighthouse');
// Mirrors the Lighthouse table of specs/00-principles.md.
const THRESHOLDS = new Thresholds(
	{ performance: 1, accessibility: 1, 'best-practices': 1, seo: 1 },
	{ 'largest-contentful-paint': 2500, 'cumulative-layout-shift': 0.1, 'total-blocking-time': 200 },
);

// The 404 page is not an indexable route: its noindex lowers the SEO score by design.
// No --dist option: `astro preview` always serves the project's dist/.
const routes = await new CommandLine([]).buildOutput(CHECK).routes();

const server = new PreviewServer(ROOT, 4322);
const failures: string[] = [];
await server.start();
let browser: Browser | undefined;

try {
	// Full Chromium (new headless mode) from Playwright, driven by Lighthouse over DevTools.
	browser = await chromium.launch({
		channel: 'chromium',
		args: [`--remote-debugging-port=${DEBUG_PORT}`],
	});
	await mkdir(REPORT_DIR, { recursive: true });
	const site = new SiteAudit(new LighthouseAuditor(DEBUG_PORT), server.url(), RUNS);
	for (const route of routes) {
		const audit = await site.route(route, (run) =>
			process.stdout.write(`\r${CHECK}: ${route} run ${run}/${RUNS}`),
		);
		process.stdout.write('\n');
		console.log(THRESHOLDS.summary(audit).join('\n'));
		failures.push(...THRESHOLDS.failures(audit));
		await writeFile(join(REPORT_DIR, `${routeName(route)}.html`), audit.medianRun().report);
	}
} finally {
	await browser?.close();
	server.stop();
}

if (failures.length > 0) {
	console.error(`${failures.join('\n')}\n\n${CHECK}: ${failures.length} threshold(s) not met`);
	process.exitCode = 1;
} else {
	console.log(`${CHECK}: all thresholds met on ${routes.length} route(s), reports in .lighthouse/`);
}
