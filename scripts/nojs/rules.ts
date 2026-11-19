// Rules of check:nojs (specs/00-principles.md, JS-1..JS-4, AL-1). Each rule inspects one tag and
// returns its findings; NoJsCheck turns them into violations with positions.
import type { Markup, Tag } from '../lib/markup.ts';

/** A rule hit at an offset of the document. */
export interface Finding {
	readonly offset: number;
	readonly pattern: string;
	readonly detail: string;
}

export interface TagRule {
	findings(tag: Tag, markup: Markup): Finding[];
}

/** `<script>` is forbidden, except inline JSON-LD holding valid JSON (ADR-007). */
export class ScriptRule implements TagRule {
	findings(tag: Tag, markup: Markup): Finding[] {
		if (tag.name !== 'script') return [];
		const type = tag.attribute('type')?.trim().toLowerCase();
		const at = (pattern: string, detail: string) => [{ offset: tag.start, pattern, detail }];
		if (type !== 'application/ld+json') {
			return at(
				'<script>',
				`<${tag.rawName}> element (type=${type ?? 'none'}); only application/ld+json is allowed`,
			);
		}
		if (tag.attribute('src') !== undefined) {
			return at('<script>', 'JSON-LD script must be inline, without src');
		}
		const error = jsonError(markup.rawText(tag));
		return error ? at('ld+json', `invalid JSON in JSON-LD block: ${error}`) : [];
	}
}

function jsonError(text: string): string | undefined {
	try {
		JSON.parse(text);
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

/** No `modulepreload`, no preloaded or prefetched script. */
export class PreloadRule implements TagRule {
	findings(tag: Tag): Finding[] {
		if (tag.name !== 'link') return [];
		const rel = tag.attribute('rel')?.toLowerCase() ?? '';
		if (rel.split(/\s+/).includes('modulepreload')) {
			return [
				{ offset: tag.start, pattern: 'modulepreload', detail: '<link rel="modulepreload">' },
			];
		}
		if (/\b(preload|prefetch)\b/.test(rel) && tag.attribute('as')?.toLowerCase() === 'script') {
			return [
				{ offset: tag.start, pattern: 'script preload', detail: `<link rel="${rel}" as="script">` },
			];
		}
		return [];
	}
}

/** Attributes matching a predicate are reported with a fixed pattern. */
export class AttributeRule implements TagRule {
	private readonly pattern: string;
	private readonly describe: string;
	private readonly matches: (name: string) => boolean;

	constructor(pattern: string, describe: string, matches: (name: string) => boolean) {
		this.pattern = pattern;
		this.describe = describe;
		this.matches = matches;
	}

	findings(tag: Tag): Finding[] {
		return tag.attributes
			.filter((attribute) => this.matches(attribute.name))
			.map((attribute) => ({
				offset: attribute.offset,
				pattern: this.pattern,
				detail: `${this.describe} ${attribute.rawName} on <${tag.rawName}>`,
			}));
	}
}

const URL_ATTRIBUTES = new Set([
	'href',
	'src',
	'action',
	'formaction',
	'xlink:href',
	'data',
	'poster',
	'background',
]);
const ANIMATION_TAGS = new Set(['animate', 'set', 'animatemotion', 'animatetransform']);
const ANIMATION_VALUES = new Set(['to', 'from', 'values', 'by']);
// data: URLs that load a document able to run scripts.
const DATA_DOCUMENT = /^data:(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml)/;

/** `javascript:` URLs (also entity-encoded or set by SVG animations) and `data:` documents. */
export class UrlRule implements TagRule {
	findings(tag: Tag): Finding[] {
		const animated = ANIMATION_TAGS.has(tag.name);
		return tag.attributes.flatMap((attribute) => {
			const isUrl = URL_ATTRIBUTES.has(attribute.name);
			if (!isUrl && !(animated && ANIMATION_VALUES.has(attribute.name))) return [];
			const url = attribute.url();
			// Animation values are `;`-separated lists: each item is a URL.
			const urls = isUrl ? [url] : url.split(';').map((item) => item.trim());
			const pattern = urls.some((item) => item.startsWith('javascript:'))
				? 'javascript: URL'
				: isUrl && DATA_DOCUMENT.test(url)
					? 'data: document'
					: undefined;
			if (!pattern) return [];
			const detail = `${attribute.rawName} on <${tag.rawName}>: "${attribute.value.slice(0, 40)}"`;
			return [{ offset: attribute.offset, pattern, detail }];
		});
	}
}

/** Every tag rule of check:nojs. */
export const TAG_RULES: readonly TagRule[] = [
	new ScriptRule(),
	new PreloadRule(),
	new AttributeRule('on* handler', 'inline event handler', (name) => /^on[a-z]+$/.test(name)),
	new AttributeRule('Alpine', 'Alpine.js attribute', (name) => /^(x-|@|:)/.test(name)),
	new AttributeRule('srcdoc', 'inline document', (name) => name === 'srcdoc'),
	new UrlRule(),
];
