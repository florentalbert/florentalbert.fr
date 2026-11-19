// In-memory doubles for unit tests.
import { extname } from 'node:path';
import type { DistFile } from '../lib/dist-file.ts';
import type { AuditResult } from '../audit/route-audit.ts';

/** A build file held in memory. */
export class FakeFile implements DistFile {
	readonly path: string;
	readonly extension: string;
	private readonly content: Buffer;

	constructor(path: string, content: string | Buffer) {
		this.path = path;
		this.extension = extname(path).toLowerCase();
		this.content = Buffer.from(content);
	}

	text(): Promise<string> {
		return Promise.resolve(this.content.toString('utf8'));
	}

	bytes(): Promise<Buffer> {
		return Promise.resolve(this.content);
	}
}

/** An audit run with fixed scores and metrics. */
export class FakeResult implements AuditResult {
	readonly report: string;
	private readonly scores: Record<string, number>;
	private readonly metrics: Record<string, number>;

	constructor(
		report: string,
		scores: Record<string, number>,
		metrics: Record<string, number> = {},
	) {
		this.report = report;
		this.scores = scores;
		this.metrics = metrics;
	}

	score(category: string): number {
		return this.scores[category] ?? 0;
	}

	metric(audit: string): number {
		return this.metrics[audit] ?? Number.POSITIVE_INFINITY;
	}
}
