// Characterization of scripts/check-budget.ts (specs/00-principles.md, "Budgets").
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { distWith, runCheck, violations, type Run } from './fixture.ts';

const SPEC_ROWS = [
	'| `budget:css-total-gzip-kb` | 1 | `budget` |',
	'| `budget:html-page-gzip-kb` | 1 | `budget` |',
	'| `budget:image-kb`          | 1 | `budget` |',
];

function check(files: Record<string, string | Buffer>, specRows: string[] = SPEC_ROWS): Run {
	const dist = distWith(files);
	const spec = join(dist, '..', 'spec.md');
	writeFileSync(spec, `# Budgets\n\n${specRows.join('\n')}\n`);
	return runCheck('check-budget.ts', ['--dist', dist, '--spec', spec]);
}

/** Incompressible content of the given size in KB. */
const noise = (kb: number): Buffer => randomBytes(kb * 1024);

describe('check-budget', () => {
	it('passes and lists every measured file when budgets are met', () => {
		const run = check({ 'index.html': '<p>x</p>', 'a.css': 'a{}', 'i.png': noise(0.5) });
		assert.equal(run.status, 0);
		assert.equal(run.lines.at(-1), 'check:budget: all budgets met');
		assert.ok(run.lines.some((line) => line.startsWith('css total')));
		assert.ok(run.lines.some((line) => line.includes('dist/i.png')));
	});

	it('reports each exceeded budget', () => {
		const run = check({
			'index.html': noise(2),
			'a.css': noise(0.6),
			'b.css': noise(0.6),
			'big.png': noise(2),
			'small.svg': '<svg/>',
		});
		assert.equal(run.status, 1);
		assert.deepEqual(
			violations(run).map((line) => line.replace(/\d+\.\d KB/g, 'N KB')),
			[
				'dist/big.png  [budget:image-kb]  N KB exceeds 1 KB',
				'dist/index.html  [budget:html-page-gzip-kb]  N KB gzip exceeds 1 KB',
				'dist/**/*.css  [budget:css-total-gzip-kb]  N KB gzip in total exceeds 1 KB',
			],
		);
	});

	it('fails when a budget row is missing from the spec', () => {
		const run = check({ 'index.html': '<p>x</p>' }, SPEC_ROWS.slice(0, 2));
		assert.equal(run.status, 1);
		assert.match(run.lines.join('\n'), /missing budget row\(s\) in .*: budget:image-kb/);
	});
});
