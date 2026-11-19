# 20 — Content

## Routes

| Route                | Source                  | Notes                     |
| -------------------- | ----------------------- | ------------------------- |
| `/`                  | `src/pages/index.astro` | Home                      |
| `/404.html`          | `src/pages/404.astro`   | Not-found page, `noindex` |
| `/sitemap-index.xml` | `@astrojs/sitemap`      | Generated, excludes 404   |
| `/robots.txt`        | `public/robots.txt`     | Points to the sitemap     |

Rules:

- URLs end with a slash (`/about/`), per [ADR-004](10-architecture.md#adr-004--url-format). Internal
  links use that form.
- Every page uses `BaseLayout`, which renders the header, the footer, and the SEO head.
- The test suite discovers routes from `dist/`, so new pages are covered without editing tests.

## Content collections

None yet. When one is added:

- Define it in `src/content.config.ts` with a `loader` and a Zod `schema`; no untyped collections.
- Entries rendered as pages must provide the SEO fields below through the schema (`title`,
  `description`), plus `draft: boolean` (default `false`). Drafts are excluded from the build.
- Document the collection (name, loader, schema fields) in this section.

## SEO

Checked on every route by `e2e:smoke` unless marked **manual**.

| Rule            | Constraint                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title           | `<title>` present, unique, ≤ 60 characters                                                                                                                                                            |
| Description     | `<meta name="description">`, 50–160 characters                                                                                                                                                        |
| Canonical       | `<link rel="canonical">` absolute, on `https://florentalbert.fr`, trailing slash; indexable pages only (none on `noindex` pages)                                                                      |
| Open Graph      | `og:title`, `og:description`, `og:type`, `og:image` (absolute URL); `og:url` = canonical on indexable pages                                                                                           |
| Language        | `<html lang="fr">`                                                                                                                                                                                    |
| Headings        | Exactly one `<h1>`                                                                                                                                                                                    |
| 404             | `<meta name="robots" content="noindex">`, absent from the sitemap                                                                                                                                     |
| Sitemap         | `/sitemap-index.xml` returns 200 and lists every indexable route                                                                                                                                      |
| robots.txt      | Returns 200 and references the sitemap                                                                                                                                                                |
| Structured data | Optional JSON-LD (valid JSON, enforced by `nojs`); schema.org validity is **manual**                                                                                                                  |
| Images          | Through `astro:assets`, AVIF/WebP, explicit dimensions, meaningful `alt` (or `alt=""` if decorative) — format and alt are **manual**, size is `budget`, missing `alt` is `lint` / `html` / `e2e:a11y` |
