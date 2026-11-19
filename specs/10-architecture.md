# 10 — Architecture

## Stack

| Layer           | Choice                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| Framework       | Astro 7, static output (`output: 'static'`, default)                                  |
| Styling         | Tailwind CSS 4 via `@tailwindcss/vite`, CSS-first config, `@tailwindcss/typography`   |
| Components      | Astro components; HyperUI (neobrutalism) markup copied by hand                        |
| Language        | TypeScript, `astro/tsconfigs/strict`                                                  |
| Package manager | npm (lockfile committed), Node ≥ 22.23.4                                              |
| Quality         | Prettier, ESLint 9 (astro + jsx-a11y), `astro check`, html-validate                   |
| Tests           | Playwright (Chromium + Firefox; visual regression on Firefox), `@axe-core/playwright` |
| Audit           | Lighthouse via `scripts/audit.ts` (on demand)                                         |
| Hooks           | plain git hook (`.githooks/`, `core.hooksPath`)                                       |

## Structure

```text
src/
  components/     Astro components (SiteHeader, SiteFooter, HyperUI-derived)
  layouts/        BaseLayout: <head>, SEO meta, skip link, header/footer
  pages/          File-based routes (see 20-content)
  styles/         global.css: Tailwind entry, plugins, @theme tokens
public/           Copied as-is (favicons, Open Graph image, robots.txt)
scripts/          Build-output checks and audit (TypeScript run by Node)
  lib/            Shared objects: BuildOutput, DistFile, Markup, Violation, CommandLine
  nojs/ budget/ audit/  One folder per check: rules, budgets, Lighthouse wiring
  tests/          node:test unit and CLI tests, in-memory fakes
tests/e2e/        Playwright specs, committed screenshot baselines (Firefox)
specs/            This folder: constraints and decisions
```

## Decisions

Short ADRs. Status is `accepted` unless stated otherwise.

### ADR-001 — Static output, zero client JavaScript

Every page is pre-rendered HTML and CSS. No islands, no client directives, no view transitions
router, no prefetch. Enforced by `check:nojs` on the build output.

### ADR-002 — Tailwind 4, CSS-first

Design tokens live in `src/styles/global.css` under `@theme`. There is no `tailwind.config.js`.
The typography plugin is loaded with `@plugin`.
Tailwind scans `src/` only (`@import 'tailwindcss' source('../')`): class names quoted in specs or
docs must not generate CSS.

### ADR-003 — HyperUI copied, never Alpine

HyperUI is not a dependency: components are copied, then adapted to project tokens and the intake
rules in [30-design](30-design.md#hyperui-intake). Variants that rely on Alpine or any script are
rebuilt with HTML/CSS or rejected.

### ADR-004 — URL format

`build.format: 'directory'` and `trailingSlash: 'always'`: every page is `dir/index.html`, served as
`/dir/`. It is the most portable layout across static hosts. **Revisit when the host is chosen**
(for example, Cloudflare Pages favors `file`); links, canonical URLs, and the sitemap must follow.

### ADR-005 — Dark mode by media query only

Color tokens are redefined in a `prefers-color-scheme: dark` media query (Tailwind's `dark:` variant
follows the same media query). No toggle, since persisting a choice requires JavaScript.

### ADR-006 — System font stack

No web fonts: zero font requests, no layout shift from font swapping.

### ADR-007 — JSON-LD allowed as the only script

`<script type="application/ld+json">` is a data block: browsers never execute it and it triggers no
request. It is the single exception to JS-1 and must contain valid JSON.

### ADR-008 — ESLint 9, not 10

`eslint-plugin-jsx-a11y` (6.10.x) supports ESLint ≤ 9, and `eslint-plugin-astro` ≥ 2 requires
ESLint ≥ 10. Pinned: `eslint@^9`, `eslint-plugin-astro@^1.7`. Revisit when jsx-a11y supports
ESLint 10.

### ADR-009 — TypeScript 6.0

`typescript-eslint` requires TypeScript < 6.1 and `@astrojs/check` requires ≤ 6.x, so TypeScript 7
is not usable yet. Pinned: `typescript@~6.0`.

### ADR-010 — lychee pinned, no fallback

Superseded by ADR-021.

### ADR-011 — Visual baselines generated locally

Screenshot baselines are generated on the developer machine and committed. They are
platform-specific (`-linux` suffix). **When CI is added**, baselines must be regenerated inside the
official Playwright Docker image matching the installed `@playwright/test` version.

### ADR-012 — CI and deployment deliberately deferred

No CI workflow and no deployment configuration for now. All checks run locally through
`npm run verify` and the pre-commit hook. The future CI runs the same `verify` script.

### ADR-013 — Pre-commit hook kept light

The hook runs `format:check`, `lint`, and `check` only; build and browser tests stay in `verify`.
It is a plain shell script in `.githooks/pre-commit`, enabled by the `prepare` script
(`git config core.hooksPath .githooks`): no hook manager dependency. `.githooks/commit-msg` checks
the commit message format (ADR-022).

### ADR-014 — Strict screenshot comparison

`toHaveScreenshot` uses `threshold: 0.02` (per-pixel color tolerance) and `maxDiffPixels: 0`.
Playwright's default `threshold: 0.2` let a `#454545` → `#5a5a5a` change pass unnoticed, and a
`maxDiffPixelRatio: 0.001` let a missing space in the footer pass (375 px). Rendering is
deterministic on the same machine: stable across repeated runs. Revisit with ADR-011 when
baselines move to Docker.

### ADR-015 — axe runs in JavaScript-enabled projects only

Superseded by ADR-021 (no JavaScript-disabled projects any more).

### ADR-016 — Foreground preview server

Astro 7 auto-backgrounds `astro preview` when it detects an AI agent, which orphans the server and
makes Playwright report an early exit. Playwright and Lighthouse start it with `--ignore-lock`
(foreground, untracked by `astro preview stop`).

### ADR-017 — Own-domain URLs checked against the build

Superseded by ADR-021.

### ADR-018 — Monochrome design

Shades of black and white only, never pure `#000`/`#fff` (user decision). Tokens and rules in
[30-design](30-design.md); checked by review of screenshots and PR diffs (ADR-021).

### ADR-019 — Minimal tooling dependencies

Lighthouse is driven by `scripts/audit.ts` (Lighthouse Node API + Playwright's Chromium) instead of
`@lhci/cli` (−250 packages); thresholds live in the script and mirror the Lighthouse table of
[00-principles](00-principles.md#budgets). No hook manager (ADR-013) and no Prettier class-sorting
plugin.

### ADR-020 — Licensing

Code under MIT (`LICENSE`), content under CC BY 4.0 (`LICENSE-CONTENT`: page texts, images, and
visual identity). Third-party code copied into the repository keeps its notice in
`THIRD-PARTY-NOTICES.md` (HyperUI intake, [30-design](30-design.md#hyperui-intake)).

### ADR-021 — Harness sized for a portfolio

Removed as redundant or too costly to maintain for a small static site:

- JavaScript-disabled Playwright projects and the runtime JS-request test: with no JavaScript in
  the output (`check:nojs`), pages behave the same with JavaScript on or off.
- ARIA snapshots: axe and jsx-a11y cover landmark semantics.
- lychee: the smoke test checks internal links, anchors, and assets; external links are no longer
  checked.
- `check:palette`: the monochrome rule is reviewed through visual snapshots and PR diffs.
- Visual regression runs on Firefox only (8 baselines).

### ADR-022 — Conventional Commits with gitmoji

Commit headers follow [Conventional Commits](https://www.conventionalcommits.org/) with a
[gitmoji](https://gitmoji.dev/) after the colon, so the type stays first and parseable by
Conventional Commits tooling:

```text
<type>[(<scope>)][!]: <gitmoji> <subject>

feat(nojs): ✨ reject srcdoc attributes
fix(budget): 🐛 keep violations in file order
```

- Lowercase type and scope; subject in the imperative, no final period; header ≤ 72 characters.
- Unicode emoji, not `:shortcodes:`.
- `!` marks a breaking change, detailed in a `BREAKING CHANGE:` footer.
- Branches: `<type>/<short-description>` (e.g. `feat/project-pages`). Changes land on `main`
  through a pull request titled like a commit header.
- Enforced by `.githooks/commit-msg` (format and length); the gitmoji choice is reviewed.

| Type       | Gitmoji | Use                                            |
| ---------- | ------- | ---------------------------------------------- |
| `feat`     | ✨      | New feature or page                            |
| `fix`      | 🐛      | Bug fix                                        |
| `docs`     | 📝      | Documentation, specs (📄 for licenses)         |
| `style`    | 🎨      | Formatting, code structure                     |
| `refactor` | ♻️      | Refactoring without behavior change            |
| `perf`     | ⚡️      | Performance                                    |
| `test`     | ✅      | Tests                                          |
| `build`    | 🔧      | Tooling configuration (➕/➖ for dependencies) |
| `ci`       | 👷      | Continuous integration                         |
| `chore`    | 🔨      | Maintenance scripts, housekeeping              |
| `revert`   | ⏪️      | Revert                                         |
