// Weight budgets (specs/00-principles.md, "Budgets").
import { gzipSync } from 'node:zlib';
import type { DistFile } from '../lib/dist-file.ts';
import { Violation } from '../lib/violation.ts';

const IMAGE_EXTENSIONS = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.avif',
	'.gif',
	'.svg',
	'.ico',
]);

export type Kind = 'css' | 'html' | 'image';

/** Weight of one file: gzipped for text assets, raw for images. */
export class Measurement {
	readonly path: string;
	readonly kind: Kind;
	readonly bytes: number;

	constructor(path: string, kind: Kind, bytes: number) {
		this.path = path;
		this.kind = kind;
		this.bytes = bytes;
	}

	label(): string {
		return this.kind === 'image' ? 'image (raw)' : `${this.kind} (gzip)`;
	}
}

/** Measure a build file, or nothing when no budget applies to its type. */
export async function measure(file: DistFile): Promise<Measurement | undefined> {
	const kind: Kind | undefined =
		file.extension === '.css'
			? 'css'
			: file.extension === '.html'
				? 'html'
				: IMAGE_EXTENSIONS.has(file.extension)
					? 'image'
					: undefined;
	if (!kind) return undefined;
	const bytes = await file.bytes();
	const size = kind === 'image' ? bytes.length : gzipSync(bytes, { level: 9 }).length;
	return new Measurement(file.path, kind, size);
}

export const kilobytes = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

export interface Budget {
	violations(measurements: readonly Measurement[]): Violation[];
}

/** Every file of a kind must stay under the limit. */
export class FileBudget implements Budget {
	private readonly name: string;
	private readonly kind: Kind;
	private readonly limitKb: number;

	constructor(name: string, kind: Kind, limitKb: number) {
		this.name = name;
		this.kind = kind;
		this.limitKb = limitKb;
	}

	violations(measurements: readonly Measurement[]): Violation[] {
		const unit = this.kind === 'image' ? '' : ' gzip';
		return measurements
			.filter((m) => m.kind === this.kind && m.bytes > this.limitKb * 1024)
			.map(
				(m) =>
					new Violation(
						m.path,
						`budget:${this.name}`,
						`${kilobytes(m.bytes)}${unit} exceeds ${this.limitKb} KB`,
					),
			);
	}
}

/** All files of a kind together must stay under the limit. */
export class TotalBudget implements Budget {
	private readonly name: string;
	private readonly kind: Kind;
	private readonly limitKb: number;

	constructor(name: string, kind: Kind, limitKb: number) {
		this.name = name;
		this.kind = kind;
		this.limitKb = limitKb;
	}

	total(measurements: readonly Measurement[]): number {
		return measurements.filter((m) => m.kind === this.kind).reduce((sum, m) => sum + m.bytes, 0);
	}

	violations(measurements: readonly Measurement[]): Violation[] {
		const total = this.total(measurements);
		if (total <= this.limitKb * 1024) return [];
		return [
			new Violation(
				`dist/**/*.${this.kind}`,
				`budget:${this.name}`,
				`${kilobytes(total)} gzip in total exceeds ${this.limitKb} KB`,
			),
		];
	}
}
