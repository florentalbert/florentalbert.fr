# 00 — Principles

Non-negotiable constraints. Every requirement names the automated control that enforces it, or is
marked **manual** when no reliable automation exists.

A change is done only when `npm run verify` passes.

## Controls

| Control            | Command                                                  | Runs in                  |
| ------------------ | -------------------------------------------------------- | ------------------------ |
| `format`           | `npm run format:check`                                   | verify, pre-commit       |
| `lint`             | `npm run lint`                                           | verify, pre-commit       |
| `types`            | `npm run check`                                          | verify, pre-commit       |
| `scripts`          | `npm run test:scripts` (unit tests of the check scripts) | verify                   |
| `nojs`             | `npm run check:nojs` (`scripts/check-nojs.ts`)           | verify                   |
| `budget`           | `npm run check:budget` (`scripts/check-budget.ts`)       | verify                   |
| `html`             | `npm run check:html` (html-validate)                     | verify                   |
| `e2e:smoke`        | `tests/e2e/smoke.spec.ts`                                | verify                   |
| `e2e:a11y`         | `tests/e2e/a11y.spec.ts`                                 | verify                   |
| `e2e:interactions` | `tests/e2e/interactions.spec.ts`                         | verify                   |
| `e2e:visual`       | `tests/e2e/visual.spec.ts` (Firefox only)                | verify                   |
| `audit`            | `npm run audit` (Lighthouse)                             | on demand, not in verify |

## Zero client-side JavaScript

| ID   | Requirement                                                                                                                                  | Control                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| JS-1 | No `<script>` element in the built output, except `<script type="application/ld+json">` whose content is valid JSON.                         | `nojs`                                                   |
| JS-2 | No `.js` / `.mjs` / `.cjs` file in `dist/`, and no file of an unexpected type (allow-list in `scripts/check-nojs.ts`).                       | `nojs`                                                   |
| JS-3 | No `modulepreload` link.                                                                                                                     | `nojs`                                                   |
| JS-4 | No inline event handler (`on*=`), no `javascript:` URL (entity-encoded or in SVG animations included), no `srcdoc`, no `data:` document URL. | `nojs`                                                   |
| JS-5 | No JavaScript request at runtime on any route.                                                                                               | `nojs` (requests can only come from the markup it scans) |
| JS-6 | Every route works without JavaScript.                                                                                                        | `nojs` (there is none to depend on), `e2e:interactions`  |
| JS-7 | No client directives (`client:*`), no `<ClientRouter />`, no prefetch script.                                                                | `nojs` (output), **manual** (review)                     |

## No Alpine.js

| ID   | Requirement                                                                                                           | Control                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| AL-1 | No Alpine attribute (`x-*`, `@event`, `:attr` bindings) in the built output.                                          | `nojs`                                   |
| AL-2 | Interactive patterns use HTML/CSS only: `<details>`/`<summary>`, `:target`, `popover`. See [30-design](30-design.md). | **manual** (review) + `e2e:interactions` |
| AL-3 | Any HyperUI component is checked against the intake rules of [30-design](30-design.md#hyperui-intake) when copied.    | **manual**                               |

## Monochrome design

| ID  | Requirement                                                                                            | Control                                             |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| D-1 | Every color is achromatic (shades of black and white), from the tokens of [30-design](30-design.md).   | **manual** (screenshots in `e2e:visual`, PR review) |
| D-2 | No pure black (`#000`) or pure white (`#fff`); no `ring-offset-*` utility (its default is pure white). | **manual** (PR review)                              |
| D-3 | Images and icons are monochrome too.                                                                   | **manual**                                          |

## Budgets

Machine-readable: `scripts/check-budget.ts` reads the `budget:` lines below. Keep the format
`` `budget:<name>` | <value> ``.

| Budget                     | Value (KB) | Control  |
| -------------------------- | ---------- | -------- |
| `budget:css-total-gzip-kb` | 15         | `budget` |
| `budget:html-page-gzip-kb` | 30         | `budget` |
| `budget:image-kb`          | 200        | `budget` |

Current CSS: about 3 KB gzip. Prototype measured when setting the budget: about 7 KB gzip with a
dozen neobrutalism components and the typography plugin.

Lighthouse (mobile emulation, median of 5 runs), enforced by `audit` only:

| Metric                                          | Threshold |
| ----------------------------------------------- | --------- |
| Performance, Accessibility, Best Practices, SEO | 1.0 each  |
| Largest Contentful Paint                        | ≤ 2500 ms |
| Cumulative Layout Shift                         | ≤ 0.1     |
| Total Blocking Time                             | ≤ 200 ms  |

## Accessibility

| ID     | Requirement                                                                                                                                                                                                                | Control                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| A11Y-1 | Zero axe violations for WCAG 2.0/2.1/2.2 A and AA, in light and dark schemes.                                                                                                                                              | `e2e:a11y`                                 |
| A11Y-2 | Zero axe violations for the WCAG AAA rules axe provides (`color-contrast-enhanced` 7:1, `identical-links-same-purpose`, `meta-refresh-no-exceptions`) and `target-size`, enabled by tag (disabled by default in axe-core). | `e2e:a11y`                                 |
| A11Y-3 | Static a11y rules on `.astro` sources (jsx-a11y strict).                                                                                                                                                                   | `lint`                                     |
| A11Y-4 | Exactly one `<h1>` per page; `<html lang="fr">`.                                                                                                                                                                           | `e2e:smoke`                                |
| A11Y-5 | Header and footer keep a sound landmark structure (banner, navigation, contentinfo).                                                                                                                                       | `e2e:a11y`, **manual**                     |
| A11Y-6 | Focus indicators have ≥ 3:1 contrast against adjacent colors (WCAG 1.4.11).                                                                                                                                                | **manual**                                 |
| A11Y-7 | Animations and transitions respect `prefers-reduced-motion`.                                                                                                                                                               | **manual**                                 |
| A11Y-8 | Everything is operable with a keyboard, in a logical order.                                                                                                                                                                | `e2e:interactions` (skip link), **manual** |
| A11Y-9 | Other AAA criteria not covered by axe.                                                                                                                                                                                     | **manual**                                 |

## Correctness and quality

| ID  | Requirement                                                           | Control      |
| --- | --------------------------------------------------------------------- | ------------ |
| Q-1 | Code is formatted with Prettier (astro plugin).                       | `format`     |
| Q-2 | ESLint passes with no warnings.                                       | `lint`       |
| Q-3 | `astro check` reports no errors, warnings, or hints.                  | `types`      |
| Q-4 | Built HTML is valid.                                                  | `html`       |
| Q-5 | No broken internal link, anchor, or asset reference.                  | `e2e:smoke`  |
| Q-6 | Visual output is unchanged unless snapshots are deliberately updated. | `e2e:visual` |
| Q-7 | SEO rules of [20-content](20-content.md#seo) hold on every route.     | `e2e:smoke`  |

## Process

| ID   | Requirement                                                                                                                                | Control                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| PR-1 | Rules or tests are never disabled to make a check pass without an explicit, documented decision.                                           | **manual**                               |
| PR-2 | Format, lint, and type checks run before every commit.                                                                                     | pre-commit hook (`.githooks/pre-commit`) |
| PR-3 | Commit messages follow Conventional Commits with a gitmoji: `<type>[(<scope>)][!]: <gitmoji> <subject>`, header ≤ 72 characters (ADR-022). | commit-msg hook (`.githooks/commit-msg`) |
| PR-4 | Work happens on a dedicated branch `<type>/<short-description>` and lands on `main` through a pull request whose title follows PR-3.       | **manual**                               |
| PR-5 | The gitmoji matches the type (table in ADR-022).                                                                                           | **manual** (review)                      |
