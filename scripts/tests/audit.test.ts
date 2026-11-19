// Unit tests of the Lighthouse audit logic, with a fake auditor (no browser, no server).
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { RouteAudit, SiteAudit } from '../audit/route-audit.ts';
import { Thresholds } from '../audit/thresholds.ts';
import { FakeResult } from './fakes.ts';

const run = (report: string, performance: number, lcp = 1000) =>
	new FakeResult(report, { performance, seo: 1 }, { 'largest-contentful-paint': lcp });

describe('SiteAudit', () => {
	it('runs the auditor sequentially, once per run, on the route URL', async () => {
		let running = 0;
		const auditor = {
			run: mock.fn(async () => {
				running++;
				assert.equal(running, 1, 'runs must not overlap');
				await new Promise((resolve) => setTimeout(resolve, 1));
				running--;
				return run('r', 1);
			}),
		};
		const onRun = mock.fn();
		await new SiteAudit(auditor, 'http://localhost:4322', 3).route('/about/', onRun);
		assert.equal(auditor.run.mock.callCount(), 3);
		assert.deepEqual(auditor.run.mock.calls[0].arguments, ['http://localhost:4322/about/']);
		assert.deepEqual(
			onRun.mock.calls.map((call) => call.arguments[0]),
			[1, 2, 3],
		);
	});
});

describe('RouteAudit', () => {
	const audit = new RouteAudit('/', [run('a', 0.9, 900), run('b', 1, 3000), run('c', 0.95, 1200)]);

	it('asserts medians, not single runs', () => {
		assert.equal(audit.score('performance'), 0.95);
		assert.equal(audit.metric('largest-contentful-paint'), 1200);
	});

	it('keeps the report of the median-performance run', () => {
		assert.equal(audit.medianRun().report, 'c');
	});

	it('treats a missing metric as failing any maximum', () => {
		assert.equal(audit.metric('total-blocking-time'), Number.POSITIVE_INFINITY);
	});

	it('refuses an empty set of runs', () => {
		assert.throws(() => new RouteAudit('/', []), /no audit result/);
	});
});

describe('Thresholds', () => {
	const thresholds = new Thresholds(
		{ performance: 1, seo: 1 },
		{ 'largest-contentful-paint': 2500 },
	);

	it('reports each threshold that is not met', () => {
		const audit = new RouteAudit('/', [run('a', 0.9, 3000)]);
		assert.deepEqual(thresholds.failures(audit), [
			'/ performance: median score 0.9 < 1',
			'/ largest-contentful-paint: median 3000.00 > 2500',
		]);
	});

	it('passes when every median is within limits', () => {
		assert.deepEqual(thresholds.failures(new RouteAudit('/', [run('a', 1, 800)])), []);
	});

	it('summarizes every threshold with its median', () => {
		assert.deepEqual(thresholds.summary(new RouteAudit('/', [run('a', 1, 800)])), [
			'  performance                       1  (min 1)',
			'  seo                               1  (min 1)',
			'  largest-contentful-paint     800.00  (max 2500)',
		]);
	});
});
