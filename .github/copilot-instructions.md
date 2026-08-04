# Copilot Instructions

This document serves as an index to task-specific instructions for GitHub Copilot. Each task has its own detailed instructions file in the `.github/prompts` directory.

## Install and Build

- Packages are located in the `packages` folder
- Use `pnpm` as the package manager
- Use `pnpm install` to install dependencies
- Use `pnpm build` to build every package
- Use `pnpm -r --filter "<pkgName>..." build` to build to a specific package `<pkgName>`
- Use `pnpm format` to format all files

## Describing changes

- Repo use `@chronus/chronus` for changelogs
- Use `pnpm change add` to add a change description for the touched packages
- Types of changes are described in `.chronus/config.yaml`

## Available Task Instructions

- [Testserver Generation](./prompts/testserver-generation.md): Instructions for generating TypeSpec HTTP spec test servers

## Breaking Change Tool (`packages/typespec-breaking-change`)

### Design Documents
- Detailed design: https://github.com/markcowl/typespec-azure/tree/rfc/breaking-changes/rfcs/breaking-changes
- Design overview: https://github.com/markcowl/typespec-azure/tree/rfc/breaking-changes-overview/rfcs/breaking-changes
- These are on separate branches (`rfc/breaking-changes` and `rfc/breaking-changes-overview`) in the markcowl fork

### Ground Truth
- Always run `tsp format` on any `.tsp` file after editing it
- Tests: `npm test` (vitest), runs ~360 tests across 18 files
- Build: `npx tsc -p tsconfig.build.json` — outputs JS to `dist/src/`
- The tool has two analysis phases:
  - **Phase A (same-version):** Compares base vs head programs for unversioned spec changes (projection bugs)
  - **Phase B (cross-version):** Compares consecutive API versions within a single program for breaking changes
- A version string NOT ending in `-preview` is considered **stable** (e.g., `2021-11-01` is stable)
- TypeSpec state maps use **object identity** — types from different compilations will never match
- For Phase A, `headType` is null when a property was removed from the head spec entirely; for Phase B, `headType` is null when a property is projected out via `@removed` but still exists in the source
- Suppression decorators: `@approvedBreakingChange` (Phase B), `@approvedUnversionedChange` (Phase A)
- Resource merge order: dedup → merge → collapse → suppress → resolveHeadSourceLocations (suppressions applied AFTER Resource merge)
- `collapsePhaseADuplicates` runs AFTER Resource merge

### Deployment to azure-rest-api-specs
- Built JS from `dist/src/*.js` is copied to `eng/tools/typespec-breaking-change/src/` in the specs repo
- After copying JS to main, **rebase** all PR branches onto main so JS changes don't appear in PR diffs
- Always verify PR diffs on GitHub (`gh pr diff`) after pushing — local `git diff` may not match GitHub's merge-base computation
