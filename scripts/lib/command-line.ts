import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildOutput } from './build-output.ts';

/** Repository root. */
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Arguments of a check script: `--name value` options. */
export class CommandLine {
	private readonly args: readonly string[];

	constructor(args: readonly string[]) {
		this.args = args;
	}

	option(name: string): string | undefined {
		const index = this.args.indexOf(`--${name}`);
		return index === -1 ? undefined : this.args[index + 1];
	}

	/** Path of an option, or a default relative to the repository root. */
	path(name: string, fallback: string): string {
		return resolve(this.option(name) ?? join(ROOT, fallback));
	}

	/** The build output (`--dist`, default `dist/`). Exits with a hint when it is missing. */
	buildOutput(check: string): BuildOutput {
		const output = new BuildOutput(this.path('dist', 'dist'));
		if (!output.exists()) {
			console.error(`${check}: dist/ not found. Run \`npm run build\` first`);
			process.exit(1);
		}
		return output;
	}
}
