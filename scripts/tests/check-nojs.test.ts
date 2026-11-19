// Characterization of scripts/check-nojs.ts (specs/00-principles.md, JS-1..JS-4, AL-1).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { distWith, runCheck, violations, type Run } from './fixture.ts';

const page = (body: string) => `<!doctype html><html lang="fr"><body>${body}</body></html>`;
const check = (files: Record<string, string>): Run =>
	runCheck('check-nojs.ts', ['--dist', distWith(files)]);

/** Assert the run fails with exactly these `[pattern]` tags, in order. */
function assertPatterns(run: Run, expected: string[]): void {
	assert.equal(run.status, 1);
	assert.deepEqual(
		violations(run).map((line) => line.match(/\[([^\]]+)\]/)?.[1]),
		expected,
	);
}

describe('check-nojs', () => {
	it('passes a static page, JSON-LD, and allowed assets', () => {
		const run = check({
			'index.html': page(
				'<a href="/a/">a</a><script type="application/ld+json">{"@type":"Person"}</SCRIPT>' +
					'<!-- <script>commented</script> -->',
			),
			'style.css': 'a{color:#141414}',
			'robots.txt': 'User-agent: *',
		});
		assert.equal(run.status, 0);
		assert.deepEqual(run.lines, ['check:nojs: no client-side JavaScript found']);
	});

	it('reports scripts with file, line, and column', () => {
		const run = check({ 'index.html': '<p>x</p>\n  <script type="module">x</script>' });
		assert.deepEqual(violations(run), [
			'dist/index.html:2:3  [<script>]  <script> element (type=module); only application/ld+json is allowed',
		]);
	});

	it('rejects invalid or external JSON-LD', () => {
		assertPatterns(
			check({
				'index.html': page(
					'<script type="application/ld+json">{bad}</script>' +
						'<script type="application/ld+json" src="/x.json"></script>',
				),
			}),
			['ld+json', '<script>'],
		);
	});

	it('rejects JavaScript files and unexpected file types', () => {
		assertPatterns(check({ 'a.js': 'x', 'b.mjs': 'x', 'c.php': 'x' }), [
			'.js file',
			'.mjs file',
			'file type',
		]);
	});

	it('scans .htm, .xhtml, and .svg files, including namespaced scripts', () => {
		assertPatterns(
			check({
				'a.htm': '<script>x</script>',
				'b.xhtml': '<script>x</script>',
				'c.svg': '<svg:svg><svg:script>x</svg:script></svg:svg>',
			}),
			['<script>', '<script>', '<script>'],
		);
	});

	it('rejects module and script preloads', () => {
		assertPatterns(
			check({
				'index.html': page(
					'<link rel="modulepreload" href="/x"><link rel="preload" as="script" href="/y">',
				),
			}),
			['modulepreload', 'script preload'],
		);
	});

	it('rejects inline handlers and Alpine attributes', () => {
		assertPatterns(
			check({ 'index.html': page('<div x-data="{}" @click="a" :class="b" onclick="c">x</div>') }),
			['Alpine', 'Alpine', 'Alpine', 'on* handler'],
		);
	});

	it('rejects javascript: URLs, also encoded or in SVG animations', () => {
		assertPatterns(
			check({
				'index.html': page(
					'<a href="javascript:x">a</a><a href="&#106;avascript:x">b</a>' +
						'<a href="java&#x09;script:x">c</a><svg><set attributeName="href" to="javascript:x"/></svg>',
				),
			}),
			['javascript: URL', 'javascript: URL', 'javascript: URL', 'javascript: URL'],
		);
	});

	it('rejects handlers and scripts written with "/" separators', () => {
		assertPatterns(
			check({ 'index.html': page('<svg/onload=x></svg><script/src="a.js"></script>') }),
			['on* handler', '<script>'],
		);
	});

	it('scans .xml files as markup', () => {
		assertPatterns(
			check({ 'feed.xml': '<x:script xmlns:x="http://www.w3.org/1999/xhtml">x</x:script>' }),
			['<script>'],
		);
	});

	it('only flags the javascript: scheme, not URLs that mention it', () => {
		const run = check({
			'index.html': page(
				'<a href="https://example.org/?q=javascript:void">a</a><a href="/blog/javascript:-tips/">b</a>',
			),
		});
		assert.equal(run.status, 0);
	});

	it('flags javascript: in any value of an SVG animation list', () => {
		assertPatterns(
			check({
				'index.html': page('<svg><animate attributeName="href" values="/a/; javascript:x"/></svg>'),
			}),
			['javascript: URL'],
		);
	});

	it('reports instead of crashing on out-of-range character references', () => {
		const run = check({ 'index.html': page('<a href="&#x110000;">a</a>') });
		assert.equal(run.status, 0);
	});

	it('rejects srcdoc and data: documents', () => {
		assertPatterns(
			check({
				'index.html': page(
					'<iframe title="a" srcdoc="<b>x</b>"></iframe><iframe title="b" src="data:text/html,x"></iframe>',
				),
			}),
			['srcdoc', 'data: document'],
		);
	});

	it('is not fooled by a comment opener inside an attribute', () => {
		assertPatterns(
			check({ 'index.html': page('<p title="<!--"></p><script>x</script><p title="-->"></p>') }),
			['<script>'],
		);
	});

	it('fails clearly when dist/ is missing', () => {
		const run = runCheck('check-nojs.ts', ['--dist', '/nonexistent/dist']);
		assert.equal(run.status, 1);
		assert.match(run.lines.join('\n'), /dist\/ not found/);
	});
});
