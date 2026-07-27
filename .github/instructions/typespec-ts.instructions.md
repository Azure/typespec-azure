---
applyTo: "packages/typespec-ts/**/*"
---

# @azure-tools/typespec-ts Development

These notes supplement the repo-level `.github/copilot-instructions.md` with details
specific to the `packages/typespec-ts` emitter. Standard repo conventions still apply
(pnpm, `pnpm build`, `pnpm change add` for changelogs).

## Scope: Azure-only

- This emitter generates **only Azure-branded** packages. The `branded` / `flavor`
  emitter options and the `PackageFlavor` type were removed. Unbranded emit lives in
  `@typespec/http-client-js`. Do not reintroduce non-Azure ("standard"/"unbranded")
  code paths, options, tests, or generated baselines.

## Collapsed generation defaults

Several emitter options were removed because only one value was ever supported. Do not
reintroduce these options or the branches they gated:

- `module-kind` — generation always targets **ESM**; there is no CommonJS output path.
- `azure-sdk-for-js` — generation always targets the **Azure SDK for JS monorepo**
  layout; there is no standalone-package path.
- `source-from` — input is always **TypeSpec**. The `sourceFrom`/`specSource` plumbing
  and all `"Swagger"` source branches were removed.

## Test layout

The package is tested through vitest projects (see `vitest.config.ts`):

- `test-next` — `test-next/**` (modern unit tests).
- `unit-modular` — `test/modular-unit/**` (Modular unit tests; Azure).
- `integration-azure-modular` — `test/azure-modular-integration/**` (Modular spector e2e).

Run them with `pnpm test-next`, `pnpm unit-test` (runs the modular unit project),
and `pnpm integration-test-ci`.
There is intentionally no non-Azure integration project — coverage for those scenarios
is a superset within the `azure-*` folders.

### Modular unit test compilation

`unit-modular` tests don't compile TypeSpec directly — they go through the helpers in
`test/util/test-util.ts` (`rlcEmitterFor`, `compileTypeSpecFor`, wrapped by
`emit-util.ts`'s `emitModular*FromTypeSpec`). Keep using these helpers; a few conventions
keep the suite fast without lowering coverage:

- **One shared `createTester`, not `createTestHost`.** A single module-level `createTester`
  loads the ~9 libraries once and clones an in-memory filesystem per compile, instead of
  re-reading every library from disk on each compile. Don't reintroduce `createTestHost` /
  the `*TestLibrary` objects for new tests — compile through the helpers (or
  `compileTypeSpecFor` for raw inline content, which is what `diagnostics.test.ts` uses).
- **Import/`using` prefix is trimmed per scenario.** The helpers only inject the libraries a
  scenario actually references (regex usage detectors near the top of `test-util.ts`).
  Detection is deliberately over-inclusive — a false positive just keeps an unused import,
  while the exact-snapshot assertions catch any false negative as a loud compile failure.
  Keep the detectors broad if you touch them.
- **Per-scenario `compileCache`.** Identical repeat compilations within a scenario are memoized and
  the cache is cleared by the scenario runner's `afterAll` (`clearCompileCache`) to bound
  retained programs. New scenario suites should run through the scenario runner so this
  stays wired up.

## Spector e2e generation pipeline

Integration (spector) tests generate real clients from specs, then assert on the output:

1. `pnpm copy:typespec` assembles `./temp/specs` from `@typespec/http-specs`,
   `@azure-tools/azure-http-specs`, and the shared custom specs in
   `test/integration/typespec/` (this `typespec/` dir is shared infra — keep it even
   though the rest of `test/integration/` is gone). It also copies assets to `./temp/assets`.
   It is a cross-platform Node script (`test/commands/copy-typespec.ts`) and runs the same
   on Windows, macOS, and Linux.
2. `spector-runner --config spector.config.yaml` (the shared
   `@azure-tools/spector-runner` CLI) reads the opt-in spec list from
   `spector.config.yaml` and compiles each in parallel, emitting into
   `test/azure-modular-integration/generated/<outputPath>`. Each spec compiles
   using the committed `tspconfig.yaml` in its output folder (which names the
   emitter + per-package options), then the config's per-instance hooks run.
   Generation is split into two phases via `--phase` (default `all` runs both):
   - `--phase compile` emits the `src/*.ts` sources the tests import (one fresh
     `tsp compile` subprocess per spec), then runs the `postCompile` hook
     (`test/commands/post-compile.js`) to write each package's `.gitignore` and a
     self-contained test `tsconfig.json`.
   - `--phase declarations` runs the `postCompileDeclarations` hook
     (`test/commands/emit-declarations.ts`) per spec — tsc `.d.ts` +
     api-extractor rollup into the tracked `src/index.d.ts` — **without
     recompiling**. Only `check:tree` consumes these, so the e2e script
     `generate-and-run` runs the vitest suite in parallel with the declaration
     regen, keeping the (slow) api-extractor work off the test critical path.
   Each hook is a short script that reads `SPECTOR_OUTPUT_DIR` (the spec's output
   folder); the shared CLI sets it per instance.
3. The vitest `integration-azure-modular` project then runs the `*.test.ts` assertions.

`pnpm regen-test-baselines` (alias of `generate-tsp-only`, which runs both phases)
regenerates all Azure baselines.

### Only `src/index.d.ts` is tracked per generated package

Each generated package writes a `.gitignore` that ignores everything except
`src/index.d.ts`, `.gitignore`, and `tspconfig.yaml`. So a generated folder is full of
files on disk (`src/*.ts`, `types/`, `temp/`), but git only tracks the rolled-up
`src/index.d.ts` (produced by the api-extractor "dtsRollup" pass in the `declarations`
phase, `test/commands/emit-declarations.ts`). The `compile` phase rewrites `src/` and
therefore _removes_ `src/index.d.ts`; the `declarations` phase restores it byte-for-byte
— so both phases must run before `check:tree`.

## CI: `e2e-test` job in `.github/workflows/ci-typescript.yml`

The e2e job runs `copy:typespec` → `spector-test` →
`pnpm check:tree`. `check:tree`
(`test/commands/check-clean-tree.ts`) **fails if regeneration leaves the git tree dirty**.
So a baseline that doesn't match freshly generated output (changed, missing, or added
`src/index.d.ts`) breaks CI even when the unit tests pass.

## Gotchas

- **Command scripts run on `node`, not `tsx`.** The `test/commands/*` scripts (including
  `copy:typespec`, `check:tree`, `post-compile.js`, `emit-declarations.ts`, and
  `gen:scenario-suites`) are executed directly with `node`, which strips TypeScript types
  natively — this requires **Node >= 22.18**. When adding or editing one: import sibling
  `.ts` files with an explicit `.ts` specifier (node does not remap `.js` -> `.ts` the way
  tsx did), and use `import type` for type-only names from CommonJS deps such as
  `typescript` (`CompilerOptions`) and `@microsoft/api-extractor`
  (`IExtractorConfigPrepareOptions`) — otherwise node tries to load them as runtime named
  exports and throws. The spector hooks are invoked by the shared `spector-runner` CLI as
  shell commands (see `hooks` in `spector.config.yaml`); each reads `SPECTOR_OUTPUT_DIR`.
  `copy:typespec` is cross-platform, so the old Windows workaround (replicating Unix
  `rm`/`cp` by hand) is no longer needed.
- **Never `git add -A` after regenerating baselines.** The api-extractor rollup step can
  intermittently fail to (re)write `src/index.d.ts` for a few specs (concurrent workers in
  the `declarations` phase share an api-extractor temp workspace per package). The folder
  still regenerates, but the tracked rollup goes missing — which `git add -A` silently
  stages as a deletion. Review `git status` for _unexpected_ deletions/additions and stage
  baseline changes by explicit path before committing. If a baseline went missing this way,
  restore it from the previous commit rather than re-deleting it.
