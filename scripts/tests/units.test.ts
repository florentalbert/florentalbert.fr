// Unit tests of the budget and no-JS checks on in-memory files.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BudgetSpec } from '../budget/budget-spec.ts';
import { FileBudget, measure, TotalBudget, type Measurement } from '../budget/budgets.ts';
import { NoJsCheck } from '../nojs/no-js-check.ts';
import type { TagRule } from '../nojs/rules.ts';
import { FakeFile } from './fakes.ts';

describe('BudgetSpec', () => {
	const spec = new BudgetSpec('| `budget:css-kb` | 15 |\n| `budget:img-kb`   |  2.5 |');

	it('reads limits from table rows', () => {
		assert.equal(spec.limit('css-kb'), 15);
		assert.equal(spec.limit('img-kb'), 2.5);
	});

	it('lists missing budgets and refuses to read them', () => {
		assert.deepEqual(spec.missing(['css-kb', 'html-kb']), ['html-kb']);
		assert.throws(() => spec.limit('html-kb'), /not declared/);
	});
});

describe('budgets', () => {
	const at = (path: string, kind: Measurement['kind'], kb: number) =>
		({ path, kind, bytes: kb * 1024, label: () => kind }) as Measurement;

	it('measures text gzipped and images raw, ignoring other files', async () => {
		const text = 'a'.repeat(10_000);
		const css = await measure(new FakeFile('dist/a.css', text));
		const png = await measure(new FakeFile('dist/a.png', text));
		assert.ok(css && css.bytes < 100, 'gzip compresses repeated text');
		assert.equal(png?.bytes, 10_000);
		assert.equal(await measure(new FakeFile('dist/robots.txt', text)), undefined);
	});

	it('checks each file of a kind against a per-file budget', () => {
		const budget = new FileBudget('image-kb', 'image', 2);
		const found = budget.violations([at('dist/a.png', 'image', 3), at('dist/b.png', 'image', 1)]);
		assert.deepEqual(found.map(String), ['dist/a.png  [budget:image-kb]  3.0 KB exceeds 2 KB']);
	});

	it('checks the sum of a kind against a total budget', () => {
		const budget = new TotalBudget('css-total-gzip-kb', 'css', 2);
		const measurements = [at('dist/a.css', 'css', 1.5), at('dist/b.css', 'css', 1)];
		assert.equal(budget.total(measurements), 2.5 * 1024);
		assert.deepEqual(budget.violations(measurements).map(String), [
			'dist/**/*.css  [budget:css-total-gzip-kb]  2.5 KB gzip in total exceeds 2 KB',
		]);
	});
});

describe('NoJsCheck', () => {
	it('applies every rule to every tag of markup files, ordered by position', async () => {
		const everyTag: TagRule = {
			findings: (tag) => [{ offset: tag.start, pattern: 'seen', detail: tag.name }],
		};
		const found = await new NoJsCheck([everyTag]).violations([
			new FakeFile('dist/index.html', '<p>\n<b>'),
			new FakeFile('dist/style.css', 'p{}'),
		]);
		assert.deepEqual(found.map(String), [
			'dist/index.html:1:1  [seen]  p',
			'dist/index.html:2:1  [seen]  b',
		]);
	});

	it('rejects scripts and unknown file types before looking at content', async () => {
		const found = await new NoJsCheck([]).violations([
			new FakeFile('dist/a.js', ''),
			new FakeFile('dist/b.wasm', ''),
		]);
		assert.equal(found.length, 2);
		assert.match(String(found[1]), /\[file type\] {2}unexpected file type "\.wasm"/);
	});
});
