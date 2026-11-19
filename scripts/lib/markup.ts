// Minimal HTML/SVG tokenizer for the build-output checks: start tags and their attributes, in
// document order, with offsets for error positions.

/** 1-based line and column in a text. */
export interface Position {
	readonly line: number;
	readonly col: number;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	colon: ':',
	tab: '\t',
	newline: '\n',
	sol: '/',
	lpar: '(',
	rpar: ')',
};

/** Decode character references, as a browser does for attribute values. */
function decodeEntities(value: string): string {
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, ref: string) => {
		const lower = ref.toLowerCase();
		if (lower.startsWith('#x')) return codePoint(Number.parseInt(lower.slice(2), 16));
		if (lower.startsWith('#')) return codePoint(Number.parseInt(lower.slice(1), 10));
		return NAMED_ENTITIES[lower] ?? match;
	});
}

/** A numeric reference as browsers resolve it: invalid code points become U+FFFD. */
function codePoint(value: number): string {
	const invalid = value === 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff);
	return String.fromCodePoint(invalid ? 0xfffd : value);
}

export class Attribute {
	/** Lowercased name. */
	readonly name: string;
	/** Name as written. */
	readonly rawName: string;
	readonly value: string;
	/** Offset of the attribute in the document. */
	readonly offset: number;

	constructor(rawName: string, value: string, offset: number) {
		this.rawName = rawName;
		this.name = rawName.toLowerCase();
		this.value = value;
		this.offset = offset;
	}

	/**
	 * The value as a browser resolves a URL: references decoded, tabs and newlines removed,
	 * leading spaces and control characters dropped, lowercased.
	 */
	url(): string {
		const url = decodeEntities(this.value).replace(/[\t\n\r]/g, '');
		let start = 0;
		while (start < url.length && url.charCodeAt(start) <= 0x20) start++;
		return url.slice(start).toLowerCase();
	}
}

export class Tag {
	/** Lowercased local name (`svg:script` → `script`). */
	readonly name: string;
	/** Name as written, prefix included. */
	readonly rawName: string;
	readonly attributes: readonly Attribute[];
	/** Offset of `<`. */
	readonly start: number;
	/** Offset just after `>`. */
	readonly end: number;

	constructor(rawName: string, attributes: Attribute[], start: number, end: number) {
		this.rawName = rawName;
		this.name = rawName.toLowerCase().replace(/^[\w.-]*:/, '');
		this.attributes = attributes;
		this.start = start;
		this.end = end;
	}

	/** Value of an attribute, matched case-insensitively. */
	attribute(name: string): string | undefined {
		return this.attributes.find((attribute) => attribute.name === name)?.value;
	}
}

const ATTRIBUTE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
// Comments and start tags in one left-to-right pass: a `<!--` inside an attribute value is
// consumed by its tag and cannot hide the markup that follows. Like browsers, `/` separates
// attributes (`<svg/onload=…>`).
const TOKEN =
	/<!--[\s\S]*?(?:-->|$)|<([a-zA-Z][\w:.-]*)((?:[\s/]+[^\s=/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)[\s/]*>/g;

/** An HTML or SVG document. */
export class Markup {
	private readonly text: string;

	constructor(text: string) {
		this.text = text;
	}

	/** Start tags in document order, comments skipped. */
	*tags(): Generator<Tag> {
		for (const token of this.text.matchAll(TOKEN)) {
			const [source, name, attributes = ''] = token;
			if (name === undefined) continue; // comment
			const attributesStart = token.index + 1 + name.length;
			yield new Tag(
				name,
				[...attributes.matchAll(ATTRIBUTE)].map(
					(match) =>
						new Attribute(
							match[1],
							match[2] ?? match[3] ?? match[4] ?? '',
							attributesStart + match.index,
						),
				),
				token.index,
				token.index + source.length,
			);
		}
	}

	/** Text content of a raw-text element (`script`, `style`). */
	rawText(tag: Tag): string {
		const rest = this.text.slice(tag.end);
		const close = rest.search(new RegExp(`</(?:[\\w.-]+:)?${tag.name}\\b`, 'i'));
		return close === -1 ? rest : rest.slice(0, close);
	}

	position(offset: number): Position {
		const before = this.text.slice(0, offset);
		return { line: before.split('\n').length, col: offset - before.lastIndexOf('\n') };
	}
}
