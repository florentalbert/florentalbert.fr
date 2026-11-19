// Unit tests of the HTML/SVG tokenizer used by check:nojs.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Attribute, Markup } from '../lib/markup.ts';

describe('Markup', () => {
	it('lists start tags with attributes, skipping comments', () => {
		const markup = new Markup(
			'<a href="/x/" data-y=\'1\' hidden><!-- <b> --><Svg:Rect fill=red />',
		);
		const tags = [...markup.tags()];
		assert.deepEqual(
			tags.map((tag) => [tag.name, tag.rawName]),
			[
				['a', 'a'],
				['rect', 'Svg:Rect'],
			],
		);
		assert.deepEqual(
			tags[0].attributes.map((a) => [a.name, a.value]),
			[
				['href', '/x/'],
				['data-y', '1'],
				['hidden', ''],
			],
		);
		assert.equal(tags[1].attribute('fill'), 'red');
	});

	it('keeps a tag whose attribute contains a comment opener', () => {
		const tags = [...new Markup('<p title="<!--"></p><script>x</script>').tags()];
		assert.deepEqual(
			tags.map((tag) => tag.name),
			['p', 'script'],
		);
	});

	it('returns raw text up to the closing tag, whatever its case', () => {
		const markup = new Markup('<script type="application/ld+json">{"a":1}</SCRIPT><p>');
		const [script] = markup.tags();
		assert.equal(markup.rawText(script), '{"a":1}');
	});

	it('accepts "/" as an attribute separator, as browsers do', () => {
		const tags = [...new Markup('<svg/onload=x><script/src="a.js"></script>').tags()];
		assert.deepEqual(
			tags.map((tag) => [tag.name, tag.attributes.map((a) => a.name)]),
			[
				['svg', ['onload']],
				['script', ['src']],
			],
		);
	});

	it('converts offsets to 1-based line and column', () => {
		assert.deepEqual(new Markup('ab\ncd').position(4), { line: 2, col: 2 });
	});
});

describe('Attribute.url', () => {
	const url = (value: string) => new Attribute('href', value, 0).url();

	it('decodes references and drops tabs, newlines, and leading controls', () => {
		assert.equal(url('&#106;ava&#x09;script:x'), 'javascript:x');
		assert.equal(url('\u0001 JaVa\nScript:x'), 'javascript:x');
		assert.equal(url('&colon;&amp;'), ':&');
	});

	it('replaces out-of-range references with U+FFFD instead of throwing', () => {
		assert.equal(url('&#x110000;&#99999999;&#0;'), '\uFFFD\uFFFD\uFFFD');
	});
});
