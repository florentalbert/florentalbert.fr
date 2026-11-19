import type { Position } from './markup.ts';

/** A broken requirement, printed as `file[:line:col]  [pattern]  detail`. */
export class Violation {
	private readonly file: string;
	private readonly pattern: string;
	private readonly detail: string;
	private readonly position?: Position;

	constructor(file: string, pattern: string, detail: string, position?: Position) {
		this.file = file;
		this.pattern = pattern;
		this.detail = detail;
		this.position = position;
	}

	toString(): string {
		const where = this.position
			? `${this.file}:${this.position.line}:${this.position.col}`
			: this.file;
		return `${where}  [${this.pattern}]  ${this.detail}`;
	}
}

/** Outcome of a check: prints violations, or a success message when there are none. */
export class Report {
	private readonly check: string;
	private readonly violations: readonly Violation[];

	constructor(check: string, violations: readonly Violation[]) {
		this.check = check;
		this.violations = violations;
	}

	/** Print the report and return the process exit code. */
	print(success: string): number {
		if (this.violations.length === 0) {
			console.log(`${this.check}: ${success}`);
			return 0;
		}
		for (const violation of this.violations) console.error(String(violation));
		console.error(`\n${this.check}: ${this.violations.length} violation(s)`);
		return 1;
	}
}
