import { readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';

/** A file of the build output. */
export interface DistFile {
	/** Path shown in messages, e.g. `dist/index.html`. */
	readonly path: string;
	/** Lowercased extension with its dot, e.g. `.html` (empty when there is none). */
	readonly extension: string;
	text(): Promise<string>;
	bytes(): Promise<Buffer>;
}

/** A build file on disk, displayed relative to the directory that contains `dist/`. */
export class DiskFile implements DistFile {
	readonly path: string;
	readonly extension: string;
	private readonly absolute: string;

	constructor(absolute: string, displayRoot: string) {
		this.absolute = absolute;
		this.path = relative(displayRoot, absolute);
		this.extension = extname(absolute).toLowerCase();
	}

	text(): Promise<string> {
		return readFile(this.absolute, 'utf8');
	}

	bytes(): Promise<Buffer> {
		return readFile(this.absolute);
	}
}
