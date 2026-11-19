// Lighthouse results of one route and their medians.

/** One audit run of a page. */
export interface AuditResult {
	/** Category score between 0 and 1 (0 when absent). */
	score(category: string): number;
	/** Numeric value of an audit (Infinity when absent, so it fails any maximum). */
	metric(audit: string): number;
	/** Full HTML report. */
	readonly report: string;
}

/** Runs one page audit. */
export interface Auditor {
	run(url: string): Promise<AuditResult>;
}

const median = (values: readonly number[]): number => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
};

/** Repeated runs of one route: Lighthouse varies between runs, so medians are asserted. */
export class RouteAudit {
	readonly route: string;
	private readonly results: readonly AuditResult[];

	constructor(route: string, results: readonly AuditResult[]) {
		if (results.length === 0) throw new Error(`no audit result for ${route}`);
		this.route = route;
		this.results = results;
	}

	score(category: string): number {
		return median(this.results.map((result) => result.score(category)));
	}

	metric(audit: string): number {
		return median(this.results.map((result) => result.metric(audit)));
	}

	/** The run whose performance score is the median, kept as the reference report. */
	medianRun(): AuditResult {
		const performance = this.score('performance');
		return this.results.find((r) => r.score('performance') === performance) ?? this.results[0];
	}
}

/** Audit every route `runs` times, strictly one run at a time (concurrency skews performance). */
export class SiteAudit {
	private readonly auditor: Auditor;
	private readonly baseUrl: string;
	private readonly runs: number;

	constructor(auditor: Auditor, baseUrl: string, runs: number) {
		this.auditor = auditor;
		this.baseUrl = baseUrl;
		this.runs = runs;
	}

	async route(route: string, onRun: (run: number) => void = () => {}): Promise<RouteAudit> {
		const results: AuditResult[] = [];
		for (let run = 1; run <= this.runs; run++) {
			results.push(await this.auditor.run(`${this.baseUrl}${route}`));
			onRun(run);
		}
		return new RouteAudit(route, results);
	}
}
