import lighthouse from 'lighthouse';
import type { AuditResult, Auditor } from './route-audit.ts';

type RunnerResult = NonNullable<Awaited<ReturnType<typeof lighthouse>>>;

/** Lighthouse result exposed as an AuditResult. */
class LighthouseResult implements AuditResult {
	readonly report: string;
	private readonly result: RunnerResult;

	constructor(result: RunnerResult) {
		this.result = result;
		this.report = String(result.report);
	}

	score(category: string): number {
		return this.result.lhr.categories[category]?.score ?? 0;
	}

	metric(audit: string): number {
		return this.result.lhr.audits[audit]?.numericValue ?? Number.POSITIVE_INFINITY;
	}
}

/**
 * Lighthouse with its defaults (mobile emulation, simulated throttling), driving an already
 * running Chromium through its DevTools port.
 */
export class LighthouseAuditor implements Auditor {
	private readonly debugPort: number;

	constructor(debugPort: number) {
		this.debugPort = debugPort;
	}

	async run(url: string): Promise<AuditResult> {
		const result = await lighthouse(url, {
			port: this.debugPort,
			output: 'html',
			logLevel: 'error',
		});
		if (!result || result.lhr.runtimeError) {
			throw new Error(`${url}: ${result?.lhr.runtimeError?.message ?? 'no Lighthouse result'}`);
		}
		return new LighthouseResult(result);
	}
}
