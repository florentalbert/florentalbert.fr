# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Personal portfolio: static Astro site, Tailwind CSS 4, HyperUI components copied by hand.

## Definition of done

A task is done only when `npm run verify` passes. Never disable a rule, skip a test, or loosen a
threshold to make it pass without saying so explicitly.

## Specs

Read the relevant file in `specs/` before changing anything; do not duplicate its content here.

- `specs/00-principles.md`: non-negotiable requirements, each mapped to the control that checks it
- `specs/10-architecture.md`: stack, structure, decisions (ADRs, including version pins)
- `specs/20-content.md`: routes, content collections, SEO rules
- `specs/30-design.md`: monochrome tokens, typography, allowed interaction patterns, HyperUI intake

## Key constraints

- Zero client-side JavaScript: no `<script>` (except JSON-LD), no `client:*`, no inline handlers.
  Interactivity uses `<details>`/`<summary>`, `:target`, or `popover`.
- No Alpine.js. Every HyperUI component copied in goes through the intake checklist in
  `specs/30-design.md` (strip Alpine/JS, map colors to tokens, fix focus and semantics).
- Monochrome only: shades of black and white from the tokens, never a hue, never pure `#000`/`#fff`.
- URLs end with `/` (`trailingSlash: 'always'`).

## Git workflow

- Work on a branch `<type>/<short-description>`, merge into `main` through a pull request.
  Open PRs with the `create-pr` skill (`.claude/skills/create-pr/`).
- Commit headers: `<type>[(<scope>)][!]: <gitmoji> <subject>`, e.g. `feat(nojs): ✨ reject srcdoc`.
  Gitmoji per type and rules in `specs/10-architecture.md` (ADR-022); the `commit-msg` hook rejects
  other formats.

## Commands

`npm run verify` runs, stopping at the first failure:

| Step                  | Command                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| Formatting            | `npm run format:check` (fix: `npm run format`)                         |
| Lint (incl. jsx-a11y) | `npm run lint`                                                         |
| Types                 | `npm run check`                                                        |
| Script unit tests     | `npm run test:scripts` (`node:test`, no build needed)                  |
| Build                 | `npm run build`                                                        |
| No JS in output       | `npm run check:nojs`                                                   |
| Weight budgets        | `npm run check:budget` (thresholds read from `specs/00-principles.md`) |
| HTML validity         | `npm run check:html`                                                   |
| E2E                   | `npm run test:e2e`                                                     |

The `check:*` steps and `test:e2e` read `dist/`: run `npm run build` first when running them alone.

E2E (Playwright, projects `chromium` and `firefox`; visual regression on `firefox` only):

- One file: `npx playwright test tests/e2e/smoke.spec.ts`
- One project: `npx playwright test --project=firefox`
- One test: `npx playwright test -g "menu opens"`
- Update visual baselines after an intended change: `npm run test:e2e:update`, then review
  the changed files in `tests/e2e/__snapshots__/` before committing them.

Not part of verify: `npm run audit` (`scripts/audit.ts`: Lighthouse, median of 5 mobile runs, all categories at
1.0, reports in `.lighthouse/`; plus external links).

Pre-commit hook (`.githooks/pre-commit`, enabled by `npm install` through `core.hooksPath`):
`format:check`, `lint`, `check`.

## Gotchas

- Astro 7 auto-backgrounds `astro preview`/`astro dev` when it detects an AI agent. Playwright and
  Lighthouse pass `--ignore-lock` to keep a foreground server; stop a stray one with
  `npx astro preview stop`.
- Tailwind only scans `src/` (`source('../')` in `global.css`): class names in specs or docs must
  not end up in the CSS.
- Scripts in `scripts/` are TypeScript run directly by Node (type stripping): import local modules
  with the `.ts` extension and use erasable syntax only (no `enum`, `namespace`, parameter
  properties; enforced by `erasableSyntaxOnly`).
- Check scripts are small classes behind interfaces (`DistFile`, `TagRule`, `Budget`, `Auditor`):
  add a `nojs` rule or a budget as a new object, and test it in `scripts/tests/` with the in-memory
  fakes of `scripts/tests/fakes.ts`.
