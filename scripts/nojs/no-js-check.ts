import type { DistFile } from '../lib/dist-file.ts';
import { Markup } from '../lib/markup.ts';
import { Violation } from '../lib/violation.ts';
import type { TagRule } from './rules.ts';

const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
// XML is scanned too: browsers render it and run XHTML-namespaced scripts.
const MARKUP_EXTENSIONS = new Set(['.html', '.htm', '.xhtml', '.svg', '.xml']);
// Every other extension fails: a script could hide under any name the server would serve.
const ALLOWED_EXTENSIONS = new Set([
	...MARKUP_EXTENSIONS,
	'.css',
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.avif',
	'.gif',
	'.ico',
	'.txt',
	'.json',
	'.webmanifest',
	'.pdf',
]);

/** Zero client-side JavaScript in the build output. */
export class NoJsCheck {
	private readonly rules: readonly TagRule[];

	constructor(rules: readonly TagRule[]) {
		this.rules = rules;
	}

	async violations(files: readonly DistFile[]): Promise<Violation[]> {
		const perFile = await Promise.all(files.map((file) => this.fileViolations(file)));
		return perFile.flat();
	}

	private async fileViolations(file: DistFile): Promise<Violation[]> {
		if (JS_EXTENSIONS.has(file.extension)) {
			return [
				new Violation(file.path, `${file.extension} file`, 'JavaScript file in build output'),
			];
		}
		if (!ALLOWED_EXTENSIONS.has(file.extension)) {
			const detail = `unexpected file type "${file.extension || '(none)'}"; extend ALLOWED_EXTENSIONS in scripts/nojs/no-js-check.ts if legitimate`;
			return [new Violation(file.path, 'file type', detail)];
		}
		if (!MARKUP_EXTENSIONS.has(file.extension)) return [];
		const markup = new Markup(await file.text());
		return [...markup.tags()].flatMap((tag) =>
			this.rules
				.flatMap((rule) => rule.findings(tag, markup))
				.sort((a, b) => a.offset - b.offset)
				.map(
					(finding) =>
						new Violation(
							file.path,
							finding.pattern,
							finding.detail,
							markup.position(finding.offset),
						),
				),
		);
	}
}
