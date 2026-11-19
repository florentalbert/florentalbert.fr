// check:budget: weight budgets for dist/ (specs/00-principles.md, "Budgets").
// Thresholds are read from the `budget:<name>` rows of the spec.
// Usage: node scripts/check-budget.ts [--dist <dir>] [--spec <file>]
import { readFile } from 'node:fs/promises';
import { BudgetSpec } from './budget/budget-spec.ts';
import { FileBudget, kilobytes, measure, TotalBudget, type Measurement } from './budget/budgets.ts';
import { CommandLine } from './lib/command-line.ts';
import { Report } from './lib/violation.ts';

const CHECK = 'check:budget';
const commandLine = new CommandLine(process.argv);
const specPath = commandLine.path('spec', 'specs/00-principles.md');
const spec = new BudgetSpec(await readFile(specPath, 'utf8'));

const missing = spec.missing(['css-total-gzip-kb', 'html-page-gzip-kb', 'image-kb']);
if (missing.length > 0) {
	console.error(
		`${CHECK}: missing budget row(s) in ${specPath}: ${missing.map((n) => `budget:${n}`).join(', ')}`,
	);
	process.exit(1);
}

const fileBudgets = [
	new FileBudget('html-page-gzip-kb', 'html', spec.limit('html-page-gzip-kb')),
	new FileBudget('image-kb', 'image', spec.limit('image-kb')),
];
const cssTotal = new TotalBudget('css-total-gzip-kb', 'css', spec.limit('css-total-gzip-kb'));

const files = await commandLine.buildOutput(CHECK).files();
const measurements = (await Promise.all(files.map(measure))).filter(
	(m): m is Measurement => m !== undefined,
);

for (const m of measurements) {
	console.log(`${m.label().padEnd(12)} ${kilobytes(m.bytes).padStart(9)}  ${m.path}`);
}
console.log(
	`${'css total'.padEnd(12)} ${kilobytes(cssTotal.total(measurements)).padStart(9)}  (budget ${spec.limit('css-total-gzip-kb')} KB gzip)\n`,
);

// Per-file violations in file order, then the totals.
const violations = [
	...measurements.flatMap((m) => fileBudgets.flatMap((budget) => budget.violations([m]))),
	...cssTotal.violations(measurements),
];
process.exitCode = new Report(CHECK, violations).print('all budgets met');
