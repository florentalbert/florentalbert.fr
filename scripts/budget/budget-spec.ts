/** Budget limits declared as `` `budget:<name>` | <value> `` table rows of a spec. */
export class BudgetSpec {
	private readonly limits: ReadonlyMap<string, number>;

	constructor(markdown: string) {
		this.limits = new Map(
			[...markdown.matchAll(/`budget:([a-z0-9-]+)`\s*\|\s*([\d.]+)/g)].map((m) => [
				m[1],
				Number(m[2]),
			]),
		);
	}

	/** Names among `required` that the spec does not declare. */
	missing(required: readonly string[]): string[] {
		return required.filter((name) => !this.limits.has(name));
	}

	/** Limit in KB. Call `missing()` first: an undeclared budget is a programming error. */
	limit(name: string): number {
		const value = this.limits.get(name);
		if (value === undefined) throw new Error(`budget:${name} is not declared`);
		return value;
	}
}
