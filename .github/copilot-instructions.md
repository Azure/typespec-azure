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

Use these guidelines when implementing or reviewing native TypeSpec linter rules,
including Swagger/LintDiff migrations. See the
[rule authoring guide](../website/src/content/docs/docs/howtos/contributing/creating-linter-rules.md)
for package selection, scaffolding, and registration.

### Implementation and scope

- Prefer existing rules, supported compiler/library APIs, and native linter callbacks over
  custom walkers, adapter factories, or mutable dispatch registries. Keep helpers and
  deduplication only where they serve a concrete requirement.
- State the native rule's applicability, exclusions, diagnostic targets, and enablement.
  Availability in a package is not activation in a ruleset. Keep implementation, registration,
  rulesets, tests, documentation, and change descriptions consistent.
- Evaluate simplifications against required behavior, not just the current implementation
  or tests. Separate genuine policy decisions from behavior-preserving cleanup; do not
  silently change scope, exceptions, or released suppression behavior.
- Keep unrelated sample upgrades and fixture synchronization in separate PRs when possible.
  Explain dependencies, fixture provenance, and how copied baselines stay synchronized.

### Tests

- Keep the rule's canonical behavior suite in its owning package's `test/rules/` directory.
  Test the shipped rule directly with package-local testers and supported public fixture APIs.
  Do not recreate the implementation, filter away unexpected diagnostics, or use private
  decorator/state APIs merely to construct a hypothetical case.
- Assert observable behavior: accepted and rejected inputs, diagnostic messages/counts, and
  exact authored targets. Prefer built-in source markers to calculated string offsets.
  For imported-file targets, submit the marked file through the tester's multi-file input.
- Cover distinct semantic boundaries rather than every Cartesian product. Use representative
  verbs, statuses, visibility values, metadata placements, and declaration kinds when they
  take the same branch. Remove cosmetic duplicates and repeated full ARM template positives.
- Preserve discriminating regressions: ambiguity and order independence, state isolation,
  recursive boundaries, authored/inherited targets, and duplicate-report prevention where
  the rule owns those behaviors. A test must fail if the behavior it claims to protect is
  removed; an exempt fixture that passes for another reason does not prove an exemption.
- Respect responsibility boundaries. Do not repeat generic compiler behavior, suppression
  machinery, or another rule's independent assertions in this suite. Retain integration
  coverage for a concrete interaction or regression. Helper tests do not replace coverage
  of rule-specific filtering or selection performed by the caller.
- Put package registration, legacy-name absence, and ruleset-default assertions in the
  appropriate public-entry/ruleset suite rather than repeating them per semantic case.
  Prefer behavioral assertions to spies on resolver calls; retain internal-path assertions
  only when needed to prove a specific side-effect or performance regression.
- Use existing test/build/lint commands. Report focused tests, broader checks, external
  integration results, and pending CI separately; do not turn a timeout or known failure
  into a success claim. For substantial traversal/resolution changes, measure representative
  base/head timing and memory rather than treating diagnostic counts as performance evidence.

### Rule documentation

- Write for TypeSpec specification authors: explain what is required, where it applies,
  why it matters, and how to correct a violation. Use native TypeSpec concepts and concise,
  actionable language rather than implementation terminology.
- Do not fill the public rule page with visitor mechanics, test strategy, internal helper
  details, or instructions for AI implementers. Keep implementation notes in contributor
  material or PR evidence, not the author-facing explanation.
- Keep legacy validator mappings and parity limitations in a dedicated migration/provenance
  section, such as `LintDiff Equivalent`, rather than interleaving them with native guidance.
  Discuss emitted OpenAPI only when it explains a real user-facing requirement or consequence.
- Edit the authored `packages/<pkg>/src/rules/<rule-name>.md` and regenerate public reference
  documentation with the owning package's existing command; do not patch generated pages alone.

### Documentation examples

- Show the smallest incorrect/correct pair that exposes the rule-owned difference. Omit
  repeated imports, service/provider setup, resource scaffolding, and unchanged defaults;
  state assumed context when necessary. Examples need not each be standalone specifications.
- Choose the intended audience explicitly. For ARM resource scenarios, prefer standard ARM
  templates and supported named customization arguments over handwritten routes/operations.
  Use the appropriate standard templates for other audiences when available. If no supported
  template can demonstrate the violation, explain that limitation in PR evidence.
- Ensure both sides reach the intended check: the correction must fix the violation rather
  than escape through an unrelated exemption. Preserve relevant key/wire names, payload fields,
  response shapes, or decorator placement while removing irrelevant boilerplate.
- Validate the actual published excerpts with the owning rule and minimal explicit public
  setup, checking the intended diagnostic contrast. A larger test inspired by an example
  does not validate the example's current text. Distinguish excerpt validation from standalone
  compilation and continuous coverage; do not add bespoke Markdown parsers or fence-count tests.

### Changelog entries

- Run `pnpm change add` from the Azure repository root. Commit unreleased Azure package entries
  under **`.chronus/changes/` at the repository root**, not `core/.chronus/changes/`, a package-local
  folder, or a generated `CHANGELOG.md`. `core/` is the separate TypeSpec compiler submodule.
- Use the actual npm package names in `packages` and a `changeKind` from `.chronus/config.yaml`.
  Describe the user-visible result: name the rule, the violation/fix, and any default ruleset
  enablement or compatibility impact. Distinguish introducing a rule from registering it disabled.
  For example:

  ```markdown
  ---
  changeKind: feature
  packages:
    - "@azure-tools/typespec-azure-resource-manager"
  ---

  Add the `resource-missing-read` lint rule requiring a read operation for ARM resources with create or update operations.
  ```

- Inspect existing task-owned unreleased entries first. Update the existing feature/fix entry
  to describe the final shipped behavior instead of adding a new entry for each review round.
  Do not add a redundant `internal` entry for test pruning, helper reuse, formatting, or
  syncing with the base branch when the same package/change already has user-facing coverage.
- Preserve unrelated entries and distinct package coverage, including a rulesets package when
  its registration/enablement changes. Choose `feature`, `fix`, `breaking`, or another configured
  kind according to the actual effect, not merely the fact that the PR is a migration.
- Run `pnpm chronus status` to check coverage. Do not add meaningless entries just to satisfy
  package detection; Markdown and test-only changes are excluded by `.chronus/config.yaml`.

## Branch and PR Workflow

- When creating worktrees or branches for new work, base them off the main Azure fork's `main` branch (Azure/typespec-azure). Depending on the user's local git remote setup, this may be called `upstream` or `origin`.
- When creating worktrees (which clone the repo), always clone recursively with `--recurse-submodules` and run `git submodule update --init` if the `core/` submodule is missing or not at the correct commit. See [CONTRIBUTING.md - Cloning recursively](https://github.com/Azure/typespec-azure/blob/main/CONTRIBUTING.md#cloning-recursively) for details.
- A new clone or worktree also needs `mise trust` (and `mise install` if tools are missing) before `pnpm` and other tools will work — see [Development Environment (mise)](#development-environment-mise).
- When pushing changes and creating pull requests, push to your personal fork and open PRs against the main Azure fork's `main` branch.

## Available Task Instructions

- [Testserver Generation](./prompts/testserver-generation.md): Instructions for generating TypeSpec HTTP spec test servers
