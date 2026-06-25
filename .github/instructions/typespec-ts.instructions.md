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
and `pnpm integration-test-ci:azure-modular`.
There is intentionally no non-Azure integration project — coverage for those scenarios
is a superset within the `azure-*` folders.

## Spector e2e generation pipeline

Integration (spector) tests generate real clients from specs, then assert on the output:

1. `pnpm copy:typespec` assembles `./temp/specs` from `@typespec/http-specs`,
   `@azure-tools/azure-http-specs`, and the shared custom specs in
   `test/integration/typespec/` (this `typespec/` dir is shared infra — keep it even
   though the rest of `test/integration/` is gone). It also copies assets to `./temp/assets`.
   It is a cross-platform Node script (`test/commands/copy-typespec.ts`) and runs the same
   on Windows, macOS, and Linux.
2. `test/commands/gen-spector.js` picks the `azureModularTsps` list from
   `test/commands/spector-list.js` (the only spec set) and runs `test/commands/run.ts`
   for each entry, emitting into `test/azure-modular-integration/generated/<outputPath>`.
   Generation is split into two phases via `--phase` (default `all` runs both):
   - `--phase=client` emits the `src/*.ts` sources the tests import. It compiles via
     `node <@typespec/compiler>/cmd/tsp.js compile` (resolved once per process) rather
     than `npx tsp`, which avoids ~5 s/spec of npx re-resolution while keeping one fresh
     subprocess per compile.
   - `--phase=declarations` emits the tracked `src/index.d.ts` baseline (tsc `.d.ts` +
     api-extractor rollup). Only `check:tree` consumes these, so the e2e script
     `generate-and-run:azure-modular` runs the vitest suite in parallel with the
     declaration regen, keeping the (slow) api-extractor work off the test critical path.
3. The vitest `integration-azure-modular` project then runs the `*.test.ts` assertions.

`pnpm regen-test-baselines` (alias of `generate-tsp-only`, which runs both phases)
regenerates all Azure baselines.

### Only `src/index.d.ts` is tracked per generated package

Each generated package writes a `.gitignore` that ignores everything except
`src/index.d.ts`, `.gitignore`, and `tspconfig.yaml`. So a generated folder is full of
files on disk (`src/*.ts`, `types/`, `temp/`), but git only tracks the rolled-up
`src/index.d.ts` (produced by the api-extractor "dtsRollup" pass in the `declarations`
phase of `run.ts`). The `client` phase rewrites `src/` and therefore _removes_
`src/index.d.ts`; the `declarations` phase restores it byte-for-byte — so both phases
must run before `check:tree`.

## CI: `e2e-test` job in `.github/workflows/ci-typescript.yml`

The e2e job runs `copy:typespec` → `integration-test-ci:azure-modular` →
`pnpm check:tree`. `check:tree`
(`test/commands/check-clean-tree.ts`) **fails if regeneration leaves the git tree dirty**.
So a baseline that doesn't match freshly generated output (changed, missing, or added
`src/index.d.ts`) breaks CI even when the unit tests pass.

## Gotchas

- **Command scripts run on `node`, not `tsx`.** The `test/commands/*` scripts (including
  `copy:typespec`, `gen-spector.js`, `check:tree`, and `gen:scenario-suites`) are executed
  directly with `node`, which strips TypeScript types natively — this requires **Node >=
  22.18**. When adding or editing one: import sibling `.ts` files with an explicit `.ts`
  specifier (node does not remap `.js` -> `.ts` the way tsx did), and use `import type` for
  type-only names from CommonJS deps such as `typescript` (`CompilerOptions`) and
  `@microsoft/api-extractor` (`IExtractorConfigPrepareOptions`) — otherwise node tries to
  load them as runtime named exports and throws. `copy:typespec` is cross-platform, so the
  old Windows workaround (replicating Unix `rm`/`cp` by hand) is no longer needed.
- **Never `git add -A` after regenerating baselines.** The api-extractor rollup step can
  intermittently fail to (re)write `src/index.d.ts` for a few specs (concurrent workers in
  gen-spector share an api-extractor temp workspace per package). The folder still
  regenerates, but the tracked rollup goes missing — which `git add -A` silently stages as
  a deletion. Review `git status` for _unexpected_ deletions/additions and stage baseline
  changes by explicit path before committing. If a baseline went missing this way, restore
  it from the previous commit rather than re-deleting it.
