// Test helpers: build a throwaway dist/ directory and run a check script against it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Outcome of a check run: exit status and combined output lines. */
export interface Run {
	status: number;
	lines: string[];
}

/** A temporary dist/ directory populated with the given files (relative path → content). */
export function distWith(files: Record<string, string | Buffer>): string {
	const dist = join(mkdtempSync(join(tmpdir(), 'check-')), 'dist');
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(dirname(join(dist, path)), { recursive: true });
		writeFileSync(join(dist, path), content);
	}
	return dist;
}

/** Run `scripts/<script>` with extra arguments, as `npm run` would. */
export function runCheck(script: string, args: string[]): Run {
	const result = spawnSync(process.execPath, [join(import.meta.dirname, '..', script), ...args], {
		encoding: 'utf8',
	});
	const output = `${result.stdout}${result.stderr}`;
	return { status: result.status ?? 1, lines: output.split('\n').filter(Boolean) };
}

/** Violation lines only (`file[:line:col]  [pattern]  detail`). */
export const violations = (run: Run): string[] =>
	run.lines.filter((line) => /^\S+ {2}\[[^\]]+\] {2}/.test(line));
