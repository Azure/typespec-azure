---
name: doc-update-tcgc
description: >
  Update TCGC (TypeSpec Client Generator Core) documentation. Use this when asked to update,
  review, or maintain documentation for the typespec-client-generator-core package, including
  user guides, emitter developer docs, design docs, and Spector test specs.
---

# TCGC Documentation Update

You are a documentation maintenance agent for the TypeSpec Client Generator Core (TCGC) library. Your goal is to ensure TCGC documentation stays accurate, complete, and up-to-date with the codebase.

## Scope and Guardrails

You may ONLY modify files in the following locations:

- `website/src/content/docs/docs/howtos/Generate client libraries/` — user documentation
- `website/src/content/docs/docs/libraries/typespec-client-generator-core/guideline.md` — emitter developer documentation
- `packages/typespec-client-generator-core/design-docs/` — design documents
- `packages/azure-http-specs/specs/` — Spector test specs
- `packages/azure-http-specs/spec-summary.md` — generated spec summary (may be updated by `pnpm regen-docs`)
- `cspell.yaml` — spelling dictionary

Do **NOT** modify TCGC source code (`packages/typespec-client-generator-core/src/`), other emitter packages, or any files outside the locations listed above.

## Documentation Areas

TCGC has several documentation areas that need maintenance:

### 1. User Documentation

Location: `website/src/content/docs/docs/howtos/Generate client libraries/`
Purpose: Guides TypeSpec users on how specs are generated to client code and how to customize generation.

### 2. Emitter Developer Documentation

Location: `website/src/content/docs/docs/libraries/typespec-client-generator-core/guideline.md`
Purpose: Shows exported types and their meanings for emitter developers building on TCGC.

### 3. Design Documents

Location: `packages/typespec-client-generator-core/design-docs/`
Purpose: Detailed design documents for TCGC features.

### 4. Test Samples (Spector)

Location: `packages/azure-http-specs/specs/`
Purpose: Functional samples demonstrating TCGC features.

## Instructions

### Step 1: Analyze Full Codebase

1. Comprehensively review the `packages/typespec-client-generator-core/` codebase
2. Catalog all decorators, types, APIs, and public interfaces exported by TCGC
3. Review `src/` for all implemented features and their behaviors
4. Check `lib/` and `generated-defs/` for decorator definitions and signatures

### Step 2: Cross-Reference Documentation

1. Compare the codebase catalog from Step 1 with existing documentation
2. Identify documentation gaps where features are not documented or under-documented
3. Find outdated documentation that doesn't match current behavior (renamed types, changed signatures, removed features, added features)
4. Verify that TypeSpec code examples in docs are syntactically valid — check decorator signatures, model shapes, and operation signatures against the current `lib/decorators.tsp` definitions

### Step 3: Review Spector Test Coverage

Spector specs should cover **all TCGC client customization features**, not just individual decorators. The goal is to ensure every customization behavior has a runnable test scenario.

1. **Map features to specs using user docs as the source of truth.** Each customization topic in the user documentation represents a feature area. For each topic, find the corresponding Spector specs under `packages/azure-http-specs/specs/`. If a documented customization has no matching spec, it is a gap.

2. **Cross-check against decorator definitions.** Some decorators or features may not yet be documented in user docs. Scan `lib/decorators.tsp` and `lib/legacy.tsp` for any features that have neither user documentation nor Spector specs.

3. **Review TCGC unit tests for expected behaviors.** Use unit tests in `packages/typespec-client-generator-core/test/` as a reference for what each feature should do, especially for features lacking Spector coverage.

4. **Add missing Spector specs.** For each gap, create specs following existing patterns and the testserver generation guidelines in `.github/prompts/testserver-generation.md`. Run validation from `packages/azure-http-specs`: `pnpm build && pnpm validate-mock-apis`.

### Step 4: Apply All Changes

Apply all findings from Steps 2 and 3 directly — do not defer any updates.

**Documentation updates:**

- Fix all outdated references, renamed types, and incorrect examples
- Add documentation for undocumented features
- For user-facing howto docs, follow existing formatting:
  - Use `<ClientTabs>` with all language code blocks (typespec, python, csharp, typescript, java, go)
  - Use the `@service` namespace pattern and realistic examples in TypeSpec code blocks
  - Mark legacy decorators with `:::caution` admonitions
- For emitter developer docs, keep descriptions aligned with the current type graph and exported interfaces
- For design docs, fix outdated type names, property names, and code examples to match current codebase

**Spector test updates:**

- Follow the testserver generation guidelines in `.github/prompts/testserver-generation.md`
- After adding specs, run the full validation sequence from `packages/azure-http-specs`:
  `pnpm build && pnpm validate-mock-apis && pnpm cspell && pnpm format && pnpm lint && pnpm regen-docs`

### Step 5: Finalize

Run `pnpm change add` from the repo root to record changelog entries for any modified packages (select "new feature" for `packages/azure-http-specs` changes).

## Focus Area Handling

Based on the focus area specified in the prompt:

- `all`: Execute Steps 1–4 across all documentation areas. Prioritize in this order: user docs → emitter docs → design docs → Spector specs. If context budget is running low, complete the current area fully before moving on, and note any remaining areas in the PR description.
- `user-docs`: Focus on user documentation in `website/src/content/docs/docs/howtos/Generate client libraries/`
- `emitter-docs`: Focus on emitter developer documentation in `website/src/content/docs/docs/libraries/typespec-client-generator-core/guideline.md`
- `design-docs`: Focus on design documents in `packages/typespec-client-generator-core/design-docs/`
- `spector`: Focus on Spector test coverage in `packages/azure-http-specs/specs/`

## Quality Guidelines

When updating documentation:

1. Study existing files in the same directory before making changes — match their formatting, heading hierarchy, and code example style exactly
2. In user-facing howto docs, every code example must use `<ClientTabs>` with all six language blocks (typespec, python, csharp, typescript, java, go), even if some languages show `// NOT_SUPPORTED`
3. Verify TypeSpec examples are syntactically consistent with current decorator signatures in `lib/decorators.tsp`
4. Link to related documentation sections when referencing other features
5. Never manually edit auto-generated files (e.g., `spec-summary.md`) — use `pnpm regen-docs` instead

## PR Description

When creating or updating the pull request, include:

- A summary of documentation areas reviewed
- A list of changes made, grouped by area (user docs, emitter docs, design docs, Spector specs)
- Any areas that could not be completed due to context budget limits
