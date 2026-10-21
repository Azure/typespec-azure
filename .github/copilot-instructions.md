# Copilot Instructions

This document serves as an index to task-specific instructions for GitHub Copilot. Each task has its own detailed instructions file in the `.github/prompts` directory.

## Development Environment (mise)

This repo pins its development tools with [mise](https://mise.jdx.dev) via `mise.toml` and `mise.lock`: Node.js, pnpm, Python, uv, Go, Java, and Maven.

- Check for mise first (`mise --version`). If it is installed, prefer the mise-managed tools over whatever happens to be on `PATH` — a globally installed `node`/`pnpm`/`python` is often the wrong version or misconfigured.
- A fresh clone or git worktree is untrusted, so mise refuses to load its config. If you see `Config files in ... are not trusted`, run `mise trust` from the repo root, then continue.
- Run `mise install` from the repo root to install the pinned versions. It is a fast no-op (`mise all tools are installed`) when everything is already present, so it is safe to run before other setup.
- Non-interactive shells (including the ones agents run commands in) usually do not have mise activated, so the pinned tools are not on `PATH`. Prefix commands with `mise exec --` (for example `mise exec -- pnpm install`, `mise exec -- pnpm build`, `mise exec -- python --version`). Without it, commands can fail with confusing errors such as `The packageManager dependency "pnpm@..." in pnpm-lock.yaml must use a registry package path`.
- Use `mise ls --current` to confirm which tool versions are active for this repo.
- If mise is not installed, fall back to the tools on `PATH`, but match the versions in `mise.toml` and the `packageManager` field in `package.json`.

## Install and Build

- Packages are located in the `packages` folder
- Use `pnpm` as the package manager (prefix with `mise exec --` when mise is installed but not activated in the shell)
- Use `pnpm install` to install dependencies
- Use `pnpm build` to build every package
- Use `pnpm -r --filter "<pkgName>..." build` to build to a specific package `<pkgName>`
- Use `pnpm format` to format all files

## Commit Rules

- Always run `pnpm format && pnpm lint` before committing.
- Always describe changes (see "Describing changes" section below).
- Do not commit the file `core` or `pnpm-lock.yaml` unless your change specifically requires updating them (e.g., the nightly bot updates the `core` submodule dependency). If these appear in your staged changes unintentionally, unstage them before committing.

## Describing changes

- Repo use `@chronus/chronus` for changelogs
- Use `pnpm change add` to add a change description for the touched packages
- Types of changes are described in `.chronus/config.yaml`

## Linter PR Review Guidelines

Apply these guidelines to all linter PRs. See the
[rule authoring guide](../website/src/content/docs/docs/howtos/contributing/creating-linter-rules.md)
for package selection, scaffolding, and registration.

### Implementation and scope

- Prefer existing rules, supported APIs, and native linter callbacks over custom infrastructure.
- Keep applicability, exceptions, targets, and enablement consistent across code, registration,
  rulesets, tests, docs, and changelogs. Distinguish registration from ruleset activation.
- Keep PRs focused. Separate behavior-preserving cleanup from intentional policy changes.

### Tests

- Test the shipped rule in its owning package's `test/rules/` suite using public APIs and
  package-local testers. Assert accepted/rejected inputs, diagnostic messages/counts, and
  authored targets; use built-in source markers instead of calculated offsets.
- Cover distinct boundaries with representative cases, not exhaustive cross-products.
  Preserve regressions that fail when the protected behavior is removed.
- Avoid duplicating compiler behavior or another rule's independent assertions. Keep integration
  tests for concrete interactions and registration/default checks in public-entry/ruleset suites.
  Prefer behavioral assertions; do not hide unexpected diagnostics with filtering.
- Run existing checks and distinguish local results from pending or failed CI.
  Measure representative timing and memory for substantial traversal/resolution changes.

### Rule documentation

- Write for TypeSpec authors: explain the requirement, applicability, rationale, and correction.
  Keep implementation details and agent instructions out of public rule pages.
- Edit `packages/<pkg>/src/rules/<rule-name>.md` and regenerate reference docs with the owning
  package's command; do not patch generated pages alone.

### Documentation examples

- Show a minimal incorrect/correct pair. Omit unrelated setup and state assumed context;
  each excerpt need not be standalone.
- Prefer audience-appropriate standard templates and supported customization arguments.
  Both examples must reach the intended check; fix the violation rather than bypassing it.
- Validate the published excerpts with the rule and explicit public setup, not just similar
  larger fixtures. Do not add bespoke Markdown parsers or fence-count tests.

### Changelog entries

- When reviewing a PR, check for redundant changelog entries. Ensure entries describe the
  final changes, not the PR's revision history or intermediate review-driven cleanup.

## Branch and PR Workflow

- When creating worktrees or branches for new work, base them off the main Azure fork's `main` branch (Azure/typespec-azure). Depending on the user's local git remote setup, this may be called `upstream` or `origin`.
- When creating worktrees (which clone the repo), always clone recursively with `--recurse-submodules` and run `git submodule update --init` if the `core/` submodule is missing or not at the correct commit. See [CONTRIBUTING.md - Cloning recursively](https://github.com/Azure/typespec-azure/blob/main/CONTRIBUTING.md#cloning-recursively) for details.
- A new clone or worktree also needs `mise trust` (and `mise install` if tools are missing) before `pnpm` and other tools will work — see [Development Environment (mise)](#development-environment-mise).
- When pushing changes and creating pull requests, push to your personal fork and open PRs against the main Azure fork's `main` branch.

## Available Task Instructions

- [Testserver Generation](./prompts/testserver-generation.md): Instructions for generating TypeSpec HTTP spec test servers
