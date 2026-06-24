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
- `unit-rlc` — `test/unit/**` (RLC unit tests; despite the `:rlc` name these are Azure).
- `unit-modular` — `test/modular-unit/**` (Modular unit tests; also Azure).
- `integration-azure-rlc` — `test/azure-integration/**` (RLC spector e2e).
- `integration-azure-modular` — `test/azure-modular-integration/**` (Modular spector e2e).

Run them with `pnpm test-next`, `pnpm unit-test` (runs both unit projects),
`pnpm integration-test-ci:azure-rlc`, and `pnpm integration-test-ci:azure-modular`.
There is intentionally no non-Azure integration project — coverage for those scenarios
is a superset within the `azure-*` folders.

## Spector e2e generation pipeline

Integration (spector) tests generate real clients from specs, then assert on the output:

1. `pnpm copy:typespec` assembles `./temp/specs` from `@typespec/http-specs`,
   `@azure-tools/azure-http-specs`, and the shared custom specs in
   `test/integration/typespec/` (this `typespec/` dir is shared infra — keep it even
   though the rest of `test/integration/` is gone). It also copies assets to `./temp/assets`.
2. `test/commands/gen-spector.js --tag=<azure-rlc|azure-modular>` picks the matching list
   from `test/commands/spector-list.js` (`azureRlcTsps` / `azureModularTsps`) and runs
   `test/commands/run.ts` for each entry, emitting into
   `test/azure-integration/generated/<outputPath>` or
   `test/azure-modular-integration/generated/<outputPath>`.
3. The vitest `integration-azure-*` project then runs the `*.test.ts` assertions.

`pnpm regen-test-baselines` (alias of `generate-tsp-only`) regenerates all Azure baselines.

### Only `src/index.d.ts` is tracked per generated package

Each generated package writes a `.gitignore` that ignores everything except
`src/index.d.ts`, `.gitignore`, and `tspconfig.yaml`. So a generated folder is full of
files on disk (`src/*.ts`, `types/`, `temp/`), but git only tracks the rolled-up
`src/index.d.ts` (produced by an api-extractor "dtsRollup" pass in `run.ts`).

## CI: `e2e-test` job in `.github/workflows/ci-typescript.yml`

The e2e job runs `copy:typespec` → `integration-test-ci:azure-modular` →
`integration-test-ci:azure-rlc` → `pnpm check:tree`. `check:tree`
(`test/commands/check-clean-tree.ts`) **fails if regeneration leaves the git tree dirty**.
So a baseline that doesn't match freshly generated output (changed, missing, or added
`src/index.d.ts`) breaks CI even when the unit tests pass.

## Gotchas

- **Windows**: `pnpm copy:typespec` (and some other scripts) use Unix `rm`/`cp` and fail
  under cmd.exe. Replicate manually in PowerShell: clear `temp`, recreate `temp/specs`
  and `temp/assets`, then `Copy-Item -Recurse -Force` the three spec sources into
  `temp/specs` and the http-specs `assets/*` into `temp/assets`.
- **Never `git add -A` after regenerating baselines.** The api-extractor rollup step can
  intermittently fail to (re)write `src/index.d.ts` for a few specs (concurrent workers in
  gen-spector share an api-extractor temp workspace per package). The folder still
  regenerates, but the tracked rollup goes missing — which `git add -A` silently stages as
  a deletion. Review `git status` for _unexpected_ deletions/additions and stage baseline
  changes by explicit path before committing. If a baseline went missing this way, restore
  it from the previous commit rather than re-deleting it.
