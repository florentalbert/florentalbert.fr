import type { RouteAudit } from './route-audit.ts';

/** Minimum category scores and maximum metric values (specs/00-principles.md, "Budgets"). */
export class Thresholds {
	private readonly minScores: Readonly<Record<string, number>>;
	private readonly maxMetrics: Readonly<Record<string, number>>;

	constructor(minScores: Record<string, number>, maxMetrics: Record<string, number>) {
		this.minScores = minScores;
		this.maxMetrics = maxMetrics;
	}

	/** One line per threshold: median value and limit. */
	summary(audit: RouteAudit): string[] {
		return [
			...Object.entries(this.minScores).map(
				([category, min]) =>
					`  ${category.padEnd(26)} ${String(audit.score(category)).padStart(8)}  (min ${min})`,
			),
			...Object.entries(this.maxMetrics).map(
				([metric, max]) =>
					`  ${metric.padEnd(26)} ${audit.metric(metric).toFixed(2).padStart(8)}  (max ${max})`,
			),
		];
	}

	failures(audit: RouteAudit): string[] {
		const scores = Object.entries(this.minScores)
			.filter(([category, min]) => audit.score(category) < min)
			.map(
				([category, min]) =>
					`${audit.route} ${category}: median score ${audit.score(category)} < ${min}`,
			);
		const metrics = Object.entries(this.maxMetrics)
			.filter(([metric, max]) => audit.metric(metric) > max)
			.map(
				([metric, max]) =>
					`${audit.route} ${metric}: median ${audit.metric(metric).toFixed(2)} > ${max}`,
			);
		return [...scores, ...metrics];
	}
}
