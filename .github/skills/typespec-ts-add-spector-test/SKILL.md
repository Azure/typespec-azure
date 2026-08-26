---
name: typespec-ts-add-spector-test
description: Add or update Spector end-to-end tests for the @azure-tools/typespec-ts emitter in packages/typespec-ts. Use when given Spector case paths, links to http-specs or azure-http-specs cases, or pull requests that add or change Spector scenarios and the TypeScript emitter must opt into generation, implement Vitest client tests, regenerate the declaration baseline, and validate against the mock server.
---

# Add Spector Tests for typespec-ts

Work in `packages/typespec-ts` and process every requested Spector case.

## Scope Boundary

This skill adds Spector tests for behavior already supported by the TypeScript emitter.

Do not modify emitter production code, shared runtime code, TypeSpec specifications, or Spector mock APIs while applying this skill. If a scenario exposes unsupported behavior or a defect, diagnose it only far enough to report a concise, evidence-based blocker. Defer the implementation or fix to a separate issue or pull request.

Do not work around unsupported behavior by weakening assertions, changing expected requests, omitting required calls, or adding a skipped test.

## Inputs

Accept one or more of:

- A path relative to a `specs` directory, such as `encode/numeric` or `azure/core/model`.
- A link under `microsoft/typespec/packages/http-specs/specs` or `Azure/typespec-azure/packages/azure-http-specs/specs`.
- A pull request in either repository that adds or changes specs.

For a pull request, inspect changed files under `packages/http-specs/specs` or `packages/azure-http-specs/specs` and identify each affected case directory.

## Expected Changes

For a new supported case, usually commit:

- An enabled entry in `packages/typespec-ts/spector.config.yaml`.
- `packages/typespec-ts/test/azure-modular-integration/generated/<output-path>/tspconfig.yaml`.
- `packages/typespec-ts/test/azure-modular-integration/generated/<output-path>/.gitignore`.
- The generated `packages/typespec-ts/test/azure-modular-integration/generated/<output-path>/src/index.d.ts`.
- A hand-written `packages/typespec-ts/test/azure-modular-integration/<descriptive-kebab-name>.test.ts`.

Generated client implementation files are ignored and must not be force-added.

## Workflow

### 1. Prepare the Package

Ensure the `core` submodule is initialized at the commit pinned by the repository. If it is missing or uninitialized, run:

```bash
git submodule update --init core
```

Do not overwrite a locally modified or intentionally checked-out submodule; use a clean worktree instead.

If mise is installed, prefix the commands below with `mise exec --`; otherwise, use `pnpm` directly.

Install dependencies only when they are missing:

```bash
pnpm install
```

Build the emitter and its dependencies from the repository root:

```bash
pnpm -r --filter "@azure-tools/typespec-ts..." build
```

From `packages/typespec-ts`, stage the current specs:

```bash
pnpm copy:typespec
```

Run this once for a batch of cases.

### 2. Resolve and Validate Each Case

Normalize links to the path beneath `specs/`.

Check `temp/specs/<spec-path>` and find its entry point, preferring `client.tsp`, then `main.tsp`; a config key may also name a `.tsp` file directly.

Find and read the applicable `mockapi.ts`.

If the path or mock API does not exist, stop processing that case and report the invalid path rather than guessing.

Read all TypeSpec files used by the case, not only the entry point.

Extract every `Scenarios.<name>` assignment and understand the validated HTTP method, URI, parameters, headers, body, response, and status.

### 3. Inspect Existing Coverage

Search `spector.config.yaml` for the exact spec key and inspect `test/azure-modular-integration` for the corresponding hand-written test.

The config is the only opt-in source; do not add a hard-coded spec list.

Resolve config entries as follows:

- `true` enables a case with `outputPath` equal to the spec key.
- `{ options: { outputPath: "..." } }` changes the generated folder and the `--filter` value.
- A list generates multiple outputs for one spec.
- `false` documents an intentionally disabled case.

Compare the mock API scenarios with existing tests.

If all scenarios are covered and passing, make no change for that case.

If coverage is partial, preserve existing behavior and add only the missing scenarios.

### 4. Opt Into Generation

Add a new enabled entry under `specs` in `spector.config.yaml`:

```yaml
specs:
  encode/numeric: true
```

Use `options.outputPath` only when the spec needs multiple configurations, names an individual `.tsp` entry point, or the generated folder must differ from the key:

```yaml
specs:
  client/naming/enum-conflict: { options: { outputPath: client/naming-enum-conflict } }
```

For multiple configurations, use a list with a unique `outputPath` for each item.

Do not change the shared Spector packages' own selection groups.

If the case is intentionally unsupported, use `false` only when requested or when the repository convention requires tracking it, and add a nearby reason with an issue link.

### 5. Add the Generated-Package Configuration

Create `test/azure-modular-integration/generated/<output-path>/tspconfig.yaml`.

Read [references/naming-and-templates.md](references/naming-and-templates.md) for the current `tspconfig.yaml` and `.gitignore` templates.

Start from the minimal template or the nearest current sibling configuration, then keep only options supported by the current emitter and required by the case.

### 6. Generate the Focused Client

From `packages/typespec-ts`, generate the selected output:

```bash
node ./test/commands/gen-spector.js --filter="$outputPath" --phase=client
```

The filter matches the resolved `outputPath` exactly, not necessarily the spec key.

Confirm `test/azure-modular-integration/generated/<output-path>/src/index.ts` exists and exports a usable client.

Read generated `src/index.ts` and the referenced client and model files to determine exact constructors, operation groups, method signatures, option bags, and return types.

Do not hand-write tests from TypeSpec names alone.

If generation fails, determine whether the failure comes from invalid test configuration or unsupported emitter behavior. Correct test configuration mistakes. For unsupported behavior or an emitter failure, stop implementing that scenario and report the observed blocker; do not modify emitter production code.

### 7. Implement the Vitest Test

Choose a descriptive kebab-case filename ending in `.test.ts`.

Search nearby tests by feature and generated path because historical filenames are not mechanically derived from spec paths.

Read [references/naming-and-templates.md](references/naming-and-templates.md) for current naming guidance, test boilerplate, imports, and assertion patterns.

Construct clients with the actual generated signature rather than assuming the common constructor shape.

Use port `3002`, allow insecure HTTP, and disable retries where the client options permit it.

Write tests that invoke every mock API scenario and assert meaningful response values when a response exists.

Match request values exactly to `mockapi.ts`.

Use generated model and options types rather than casts or `any`.

Follow current nearby patterns for paging, long-running operations, credentials, multipart requests, and error assertions.

Do not remove a failing scenario merely to make the file green.

Treat a correctly written failing test as unsupported behavior or an emitter/runtime defect to report. Do not fix that defect as part of this skill.

Do not add new skipped tests for unsuccessful scenarios. Exclude their incomplete test changes and report the failure instead. Preserve existing skipped tests unless their linked issue is resolved and the test now passes.

### 8. Validate Against Spector

Start the server from `packages/typespec-ts` in a separate process:

```bash
pnpm start-test-server
```

Wait until the server is listening on port `3002`, then run only the affected test files:

```bash
pnpm exec vitest run --project integration-azure-modular "test/azure-modular-integration/$testFile.test.ts"
```

Always stop the server afterward, including after failures:

```bash
pnpm stop-test-server
```

For a failure, first correct mistakes in the test by rechecking `mockapi.ts`, TypeSpec semantics, and generated signatures. If the test is correct and the generated client still cannot satisfy the scenario, report the blocker and remove the incomplete test changes. Do not change production code.

Do not run the full `spector-test` command for focused validation because it regenerates and tests every opted-in case.

### 9. Regenerate the Tracked Baseline

After focused tests pass, run both generation phases for each changed output:

```bash
node ./test/commands/gen-spector.js --filter="$outputPath"
```

Confirm `generated/<output-path>/src/index.d.ts` exists.

The client phase removes this tracked rollup and the declaration phase restores it, so do not finish after `--phase=client`.

Review `git status` for the expected config, test, `.gitignore`, `tspconfig.yaml`, and `src/index.d.ts` changes.

Never use `git add -A` for generated baselines, and do not accept unexpected baseline deletions.

Run the repository formatter and the smallest relevant lint command before completion.

### 10. Report

Report each processed spec path and output path, newly covered scenarios, already-covered scenarios, and unsuccessful scenarios.

For each unsuccessful scenario, report the stage that failed (generation, compilation, request validation, or response validation), the observed generated-client behavior, the expected behavior from `mockapi.ts`, and an existing issue link when one is available.

Do not propose or implement an emitter fix unless a separate task explicitly requests it.

If working on a pull request, keep its implementation-status section accurate.
