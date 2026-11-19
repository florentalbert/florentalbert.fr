# 30 — Design

Neobrutalism, **monochrome**: shades of black and white only, thick borders, hard offset shadows,
square corners, high contrast. No hue at all, and never pure black (`#000`) or pure white (`#fff`).

## Tokens

Defined in `src/styles/global.css` under `@theme`. Color tokens are redefined in a
`prefers-color-scheme: dark` block, so components use semantic utilities (`bg-paper`, `text-ink`,
`border-ink`, `shadow-brutal`) and rarely need `dark:` variants.

| Token             | Light                          | Dark      | Use                                         |
| ----------------- | ------------------------------ | --------- | ------------------------------------------- |
| `--color-paper`   | `#fafafa`                      | `#141414` | Page background                             |
| `--color-surface` | `#e5e5e5`                      | `#292929` | Raised or highlighted surfaces, hover fills |
| `--color-ink`     | `#141414`                      | `#f5f5f5` | Text, borders, hard shadows, focus outlines |
| `--color-muted`   | `#454545`                      | `#c4c4c4` | Secondary text                              |
| `--shadow-brutal` | `4px 4px 0 0 var(--color-ink)` | same      | Default hard shadow                         |
| Border width      | `2px` (`border-2`)             | same      | All framed components                       |
| Radius            | `0`                            | same      | No rounded corners                          |

Contrast of every text pairing (WCAG ratio, AAA needs 7:1):

| Pairing                 | Light | Dark  |
| ----------------------- | ----- | ----- |
| ink on paper            | 17.65 | 16.90 |
| ink on surface          | 14.62 | 13.34 |
| muted on paper          | 9.19  | 10.56 |
| muted on surface        | 7.61  | 8.34  |
| paper on ink (inverted) | 17.65 | 16.90 |

Emphasis and active states use inversion (`bg-ink text-paper`) or `surface`, never a hue. An
inverted element never carries a hard shadow (an `ink` shadow on an `ink` fill is invisible): add
`shadow-none` together with the inversion, including on `hover:` and `group-open:` states. New
shades must be achromatic (equal R, G, B), not `#000`/`#fff`, and keep 7:1 for text in both
schemes. Monochrome is checked in review (visual snapshots, PR diffs).

## Typography

- Font: Tailwind's default system stacks (`font-sans`, `font-mono`); no web fonts (ADR-006).
- Scale: Tailwind defaults. Headings `font-black`; body `text-base`/`text-lg`, `leading-relaxed`.
- Long-form content uses `prose prose-tokens`: `prose` from `@tailwindcss/typography`, and the
  `prose-tokens` utility (in `global.css`) that maps its colors to the tokens above, so that captions,
  quotes, and code meet 7:1 and stay monochrome.
- Line length: `max-w-prose` (about 65 characters) for running text.

## Interaction patterns

All interactivity is HTML/CSS. Allowed:

| Need                               | Pattern                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Mobile menu, accordion, disclosure | `<details>`/`<summary>`; exclusive accordions with `<details name="…">`  |
| Tabs, in-page panels               | Anchor links + `:target` styling, content readable when no target is set |
| Dropdown, tooltip-like panel       | `popover` attribute + `popovertarget` button                             |
| Hover, focus, pressed states       | CSS (`hover:`, `focus-visible:`, `active:`, `group-open:`)               |

Forbidden: Alpine.js (`x-*`, `@event`, `:binding`), inline handlers, `<script>` (except JSON-LD),
`client:*` directives, `<dialog>` opened by script. Newer declarative APIs (for example invoker
commands) are allowed only once supported in both Chromium and Firefox and covered by a test.

Motion: transitions are short and wrapped with `motion-safe:` or neutralized with
`motion-reduce:`.

Focus: every interactive element shows a visible `focus-visible` outline in `ink`
(2px, offset 2px). Never remove an outline without a replacement (A11Y-6). Use `outline-offset`,
never `ring-offset-*` (its default offset color is pure white).

## HyperUI intake

Checklist applied to every component copied from HyperUI:

1. Pick the neobrutalism variant when one exists; take the markup only.
2. Remove anything Alpine or script-based (`x-*`, `@click`, `<script>`). If behavior is needed,
   rebuild it with a pattern from the table above, or drop the component.
3. Replace every color utility (`black`, `white`, `gray-*`, `yellow-*`, any hue) with tokens; turn
   colored accents into inversion or `surface`; drop `dark:` variants made redundant by the tokens.
4. Replace colored focus rings (`focus:ring-yellow-*`, etc.) with the ink focus outline.
5. Replace `href="#"` placeholders with real routes (trailing slash) or remove the link.
6. Fix semantics: heading level fits the page outline, decorative SVGs get `aria-hidden="true"`,
   icon-only controls get an accessible name.
7. Wrap it in an Astro component with typed `Props`.
8. Credit it: HyperUI is MIT-licensed, so add the component to `THIRD-PARTY-NOTICES.md` (create it
   with HyperUI's copyright and license text on the first copy) and reference the source URL in a
   comment at the top of the component.
9. Run `npm run verify`; update visual baselines only for intended changes.
