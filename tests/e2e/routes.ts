// Routes discovered from the production build, so new pages are tested without editing specs.
// Same discovery as the Lighthouse audit (scripts/lib/build-output.ts).
import { join } from 'node:path';
import { BuildOutput, routeName } from '../../scripts/lib/build-output.ts';

export interface PageCase {
	/** Readable name, used in test titles and snapshot names. */
	name: string;
	path: string;
	status: number;
}

const output = new BuildOutput(join(import.meta.dirname, '..', '..', 'dist'));
if (!output.exists()) {
	throw new Error('dist/ not found. Run `npm run build` before the e2e tests');
}

export const routes: string[] = await output.routes();

/** Every indexable route, plus an unknown URL that must render the 404 page. */
export const pages: PageCase[] = [
	...routes.map((path) => ({ name: routeName(path), path, status: 200 })),
	{ name: '404', path: '/this-page-does-not-exist/', status: 404 },
];

export const SITE = 'https://florentalbert.fr';
