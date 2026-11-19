import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

/**
 * `astro preview` in the foreground: `--ignore-lock` prevents Astro from auto-backgrounding it
 * when an AI agent runs the command (specs/10-architecture.md, ADR-016).
 */
export class PreviewServer {
	private readonly root: string;
	private readonly port: number;
	private process?: ChildProcess;

	constructor(root: string, port: number) {
		this.root = root;
		this.port = port;
	}

	url(): string {
		return `http://localhost:${this.port}`;
	}

	/**
	 * Start the server and wait until it answers (up to 20 s). Refuses a port that is already
	 * served: a stale server would be audited instead of this build.
	 */
	async start(): Promise<void> {
		if (await this.answers()) {
			throw new Error(`port ${this.port} is already in use: stop the server running there`);
		}
		const child = spawn(
			join(this.root, 'node_modules/.bin/astro'),
			['preview', '--port', String(this.port), '--ignore-lock'],
			{ cwd: this.root, stdio: 'ignore' },
		);
		this.process = child;
		let failure: string | undefined;
		child.once('error', (error) => (failure = error.message));
		child.once('exit', (code) => (failure ??= `astro preview exited early (code ${code})`));
		for (let attempt = 0; attempt < 100 && !failure; attempt++) {
			if (await this.answers()) return;
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		this.stop();
		throw new Error(failure ?? `astro preview did not start on port ${this.port}`);
	}

	stop(): void {
		this.process?.kill();
	}

	private async answers(): Promise<boolean> {
		try {
			return (await fetch(`${this.url()}/`)).ok;
		} catch {
			return false; // not listening yet
		}
	}
}
