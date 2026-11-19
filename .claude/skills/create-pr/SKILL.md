---
name: create-pr
description: Push the current branch and open a GitHub pull request into main that follows the project conventions (Conventional Commits + gitmoji title, Summary / Test plan body, verify passing). Use when the user asks to open, create, or submit a PR for the current work.
---

# Create a pull request

Opens a PR from the current branch into `main` with `gh`, following `specs/00-principles.md`
(PR-1..PR-5) and `specs/10-architecture.md` (ADR-022). Stop and report at the first failed step;
never work around a failure.

## 1. Check the branch

```sh
git branch --show-current
git status --short
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

- The branch must not be `main` and must be named `<type>/<short-description>`
  (types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert). Otherwise stop:
  never open a PR from `main`, never rename a branch without asking.
- The working tree must be clean. Uncommitted changes: ask whether to commit them first.
- If the default branch is not `main`, tell the user (it can be fixed with
  `gh repo edit --default-branch main`, only with their approval) and continue: the PR targets
  `main` explicitly.
- `main` must exist on the remote (`git ls-remote --heads origin main`). If it does not, ask
  before pushing it.

## 2. Check the commits

```sh
git log --format=%s origin/main..HEAD
```

Every header must match `<type>[(<scope>)][!]: <gitmoji> <subject>`, at most 72 characters, with the
gitmoji matching the type (table in ADR-022). The `commit-msg` hook enforces the format; check the
gitmoji choice yourself. If a header is wrong, propose a fix and ask before rewriting history.

## 3. Run verify

```sh
npm run verify
```

A PR is opened only when it passes (definition of done in `CLAUDE.md`). Keep the real figures for
the test plan: number of script tests and e2e tests, and `css total` from `check:budget`. If it
fails, report the failing step and stop. Run `npm run audit` too when the change can affect
performance, accessibility, or SEO (pages, layout, styles, images), and report its result.

## 4. Push

```sh
git push -u origin HEAD
```

Never force-push without explicit approval.

## 5. Write the title and body

**Title**: a commit-style header (step 2 rules) summarizing the whole branch. With a single commit,
reuse its header.

**Body**, written to a temporary file in the scratchpad directory:

```markdown
## Summary

<One sentence: what the PR does and why.>

- <Change grouped by area, with paths in backticks.>
- <Spec or ADR added/changed, if any.>

## Test plan

- [x] `npm run verify` passes (<N> script tests, <M> e2e tests)
- [x] <Each manual or negative check actually performed, with its result.>
- [ ] <What the reviewer should look at, e.g. updated visual baselines.>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- Tick only what was actually run in this session; never claim an unrun check.
- List updated baselines (`tests/e2e/__snapshots__/`) and any rule, test, or threshold that was
  disabled or loosened (PR-1), with the reason.
- Mention new dependencies and version pins.

## 6. Create the PR

```sh
gh pr create --base main --head "$(git branch --show-current)" \
  --title "<title>" --body-file <scratchpad>/pr-body.md
```

If a PR already exists for the branch (`gh pr view` succeeds), update it with `gh pr edit`
instead of creating another one.

## 7. Report

Give the PR URL, the title, and anything left to the user (default branch, items to review).
