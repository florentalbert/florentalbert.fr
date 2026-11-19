import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { DiskFile, type DistFile } from './dist-file.ts';

/** Short name of a route for reports and snapshots: `/` → `home`, `/blog/post/` → `blog-post`. */
export const routeName = (route: string): string =>
	route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-|-$/g, '');

/** The `dist/` directory produced by `astro build`. */
export class BuildOutput {
	private readonly dir: string;

	constructor(dir: string) {
		this.dir = dir;
	}

	exists(): boolean {
		return existsSync(this.dir);
	}

	/** Every file, sorted by path. */
	async files(): Promise<DistFile[]> {
		const entries = await readdir(this.dir, { withFileTypes: true, recursive: true });
		return entries
			.filter((entry) => entry.isFile())
			.map((entry) => join(entry.parentPath, entry.name))
			.sort()
			.map((absolute) => new DiskFile(absolute, dirname(this.dir)));
	}

	/** Indexable routes (`/`, `/about/`), from `index.html` files (`build.format: 'directory'`). */
	async routes(): Promise<string[]> {
		const entries = await readdir(this.dir, { recursive: true, encoding: 'utf8' });
		return entries
			.filter((path) => path === 'index.html' || path.endsWith(`${sep}index.html`))
			.map((path) => relative('.', dirname(path)).split(sep).join('/'))
			.map((dir) => (dir === '' ? '/' : `/${dir}/`))
			.sort();
	}
}
