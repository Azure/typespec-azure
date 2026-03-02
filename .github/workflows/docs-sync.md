---
description: Daily workflow to identify documentation files that are out of sync with recent code changes and open a pull request with necessary updates.
on:
  schedule: daily on weekdays
permissions:
  contents: read
  pull-requests: read
  issues: read
tools:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    max: 1
    base-branch: main
  noop:
    max: 1
  missing-tool:
    create-issue: true
---

# Documentation Sync

You are an AI agent responsible for keeping the documentation in the **Azure/typespec-azure** repository up to date with recent code changes.

## Your Task

1. **Find recent code changes**: Look at commits on the `main` branch from the **last 7 days**. Focus on changes to source files in:
   - `packages/` (TypeSpec Azure libraries and emitters)
   - `core/packages/` (core TypeSpec packages)

2. **Identify impacted documentation**: For each meaningful code change (new features, renamed APIs, changed behavior, new linting rules, removed functionality), determine which documentation files under `website/src/content/docs/` could be affected. Key documentation areas:
   - `website/src/content/docs/docs/libraries/` — per-library docs, linting rule docs, reference pages
   - `website/src/content/docs/docs/emitters/` — emitter documentation
   - `website/src/content/docs/docs/howtos/` — how-to guides
   - `website/src/content/docs/docs/reference/` — reference documentation

3. **Check for gaps**: Compare the code changes against the existing docs. Look for:
   - New decorators, models, or operations that are undocumented
   - Linting rules added or changed in code but missing or outdated in the docs
   - Changed API signatures or behavior not reflected in examples
   - New features without corresponding how-to or reference documentation
   - Renamed or removed APIs still referenced in docs

4. **Make updates**: For each documentation gap found, edit the relevant markdown files to bring them in sync with the code. Keep the existing writing style and formatting conventions. Be precise and minimal — only update what is necessary.

5. **Open a pull request**: If you made any documentation updates, open a pull request with:
   - Title: `[docs-sync] Update documentation for recent code changes`
   - Body: A summary of what documentation was updated and why, referencing the relevant commits or PRs that introduced the code changes
   - Branch name: `docs-sync/update-<date>` where `<date>` is today's date in YYYY-MM-DD format

## Guidelines

- **Do not invent information.** Only document behavior you can verify from the source code.
- **Preserve existing style.** Match the tone, formatting, and structure of surrounding documentation.
- **Be conservative.** If you are unsure whether a code change requires a doc update, skip it.
- **One PR per run.** Batch all documentation updates into a single pull request.
- **Skip trivial changes.** Ignore refactors, test-only changes, CI changes, and dependency bumps that don't affect public APIs or documented behavior.
- **Markdown formatting**: Use GitHub-flavored markdown. For code examples, use ` ```tsp ` fenced blocks for TypeSpec code.

## Safe Outputs

- If you updated documentation files, use the `create-pull-request` safe output to open a PR.
- **If there is nothing to update** (docs are already in sync), call the `noop` safe output with a message like: "Documentation is up to date — no changes needed for the past 7 days of commits."
