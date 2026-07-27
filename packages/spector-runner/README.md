# @azure-tools/spector-runner

Shared loader and JSON schema for the standardized per-emitter spector
test-selection config, `spector.config.yaml`.
Tracking issue: [#4997](https://github.com/Azure/typespec-azure/issues/4997).

This is a private, dev-only package used by emitter regeneration scripts. It is
not published and is not part of any emitter's runtime output.

The JSON schema is generated from [`schema/spector-config.tsp`](./schema/spector-config.tsp)
via `@typespec/json-schema` (`pnpm regen-schema`) to `schema/dist/SpectorConfig.json`.

## Config format

An opt-in allowlist of spec files to generate. Only specs listed with a truthy
value are generated.

```yaml
# yaml-language-server: $schema=../spector-runner/schema/dist/SpectorConfig.json
specs:
  azure/core/basic: true # run, no options

  type/enum/extensible: # run + custom emitter options
    options:
      namespace: type.enums.extensible

  # nested pageItems/nextLink not supported: https://github.com/Azure/autorest.go/issues/1494
  azure/payload/pageable: false # tracked skip; comment carries the reason/issue
```

- **`true`** — generate, no options.
- **`{ options: {...} }`** — generate with opaque emitter options.
- **`[{ options }, ...]`** — generate once per option-set (multiple outputs).
- **`false`** — tracked skip (a YAML comment documents why).
- **omitted** — untracked skip.

## Usage

```ts
import { loadSpectorConfig, resolveSpecs } from "@azure-tools/spector-runner";

const config = loadSpectorConfig("spector.config.yaml");
for (const { path, options } of resolveSpecs(config)) {
  // compile `path` with `options`
}
```

## Compiling scenarios

`compileScenarios` builds a set of scenarios in parallel by spawning one
`tsp compile` subprocess per scenario (up to `jobs` at a time, defaulting to the
number of CPUs). It resolves the local `tsp` CLI from `cwd`, reports progress
through a `TaskRunner` (shared with `@typespec/tsp-integration`), and prints a
`=== Summary ===` block at the end.

```ts
import { compileScenarios, resolveSpecEntrypoint } from "@azure-tools/spector-runner";

const scenarios = resolveSpecs(config).map(({ path, options }) => ({
  name: path,
  entrypoint: resolveSpecEntrypoint(specsRoot, path),
  emit: ["@azure-tools/typespec-go"],
  options: { "@azure-tools/typespec-go": options },
}));

const summary = await compileScenarios(scenarios, {
  jobs: 8,
  cwd: emitterPackageRoot, // where `tsp` and the emitter are installed
  config: "path/to/stub/tspconfig.yaml", // optional: passed as --config to every compile
  onScenarioComplete: (result) => {
    // per-scenario post-processing (runs after each subprocess exits)
  },
});

console.log(`${summary.succeeded}/${summary.results.length} succeeded`);
```

`resolveSpecEntrypoint` maps a config spec-path key to its entry file (an
explicit `.tsp` key, otherwise `client.tsp` preferred over `main.tsp`).

Each `CompileScenario` may set a per-scenario `cwd`, overriding the run-wide
`cwd` for that one compile. Use it when scenarios must run in their own output
folder — e.g. the TypeScript regenerator, where every generated folder ships a
committed `tspconfig.yaml` resolved relative to it (`--config tspconfig.yaml`).
The `tsp` CLI is still located from the run-wide `cwd`.

`TaskRunner` and `runWithConcurrency` are also exported for reuse.

The Go (`typespec-go/.scripts/spector-runner.config.js`), TypeScript
(`typespec-ts/test/commands/spector-runner.config.js`) and Python
(`typespec-python/eng/scripts/ci/regenerate.ts`) regenerators all drive their
spec compilation through this engine — see [Config files & hooks](#config-files--hooks).

## `spector-runner` CLI

For the common case you don't need any wrapper script — the `spector-runner`
bin builds every scenario in a `spector.config.yaml` and compiles them in
parallel for a given emitter:

```bash
spector-runner \
  --config path/to/spector.config.yaml \
  --specs-root path/to/specs \
  --emit . \
  --output-dir "generated/{parentDir}/{options.module}"
```

Key flags (see `spector-runner --help` for the full list):

- **`--config <path>`** — a `spector.config.yaml` (repeatable to merge several).
- **`--specs-root <dir>`** — root the spec-path keys are relative to. Defaults to
  the config's `specsRoot`.
- **`--emit, --emitter <e>`** — emitter package name or path (`.` for the local
  package; repeatable). Path-like values are resolved and their `package.json`
  `name` is used to namespace options. Optional when the config sets
  `compileConfig` (the emitter then comes from each committed `tspconfig.yaml`).
- **`--output-dir <template>`** — `emitter-output-dir` template. Placeholders:
  `{path}` (spec key), `{dir}` (its directory, `.tsp` stripped), `{parentDir}`
  (`{dir}` minus its last segment), `{outputPath}` (the `outputPath` option,
  defaulting to `{path}`) and `{options.NAME}` (a spec option value). Defaults to
  the config's `outputDir`.
- **`--option <key=value>`** — default emitter option (repeatable); per-spec
  config options override these by key.
- **`--tspconfig <path>`** — stub `tspconfig.yaml` passed as `--config` to every
  compile (prevents option bleed from an upstream config next to the specs).
- **`--phase <all|compile|declarations>`** — which lifecycle phase(s) to run when
  the config declares [hooks](#hooks-in-spectorconfigyaml). Default `all`.
- **`--cwd <dir>`** — directory to run compiles/hooks in and resolve the local
  `tsp` CLI + emitter. Defaults to `process.cwd()`.
- **`--jobs <n>`**, **`--filter <regex>`**, **`--verbose`**.

The same logic is available programmatically as `runSpectorRunner` (and the
lower-level `buildScenarios`), which additionally accept `extraScenarios` and an
`onScenarioComplete` hook so an emitter can add its own local specs and
post-processing on top of the config-driven ones:

```ts
import { runSpectorRunner } from "@azure-tools/spector-runner";

const summary = await runSpectorRunner({
  config: ["http.spector.config.yaml", "azure.spector.config.yaml"],
  specsRoot,
  emit: ["."],
  outputDir: "test/http-specs/{parentDir}/{options.module}",
  cwd: emitterPackageRoot,
  extraScenarios: [...emitterLocalSpecs],
  onScenarioComplete: ({ scenario, success }) => {
    // metadata patch / cleanup
  },
});
```

## Hooks in `spector.config.yaml`

For the common case an emitter needs no wrapper module at all: declare the
output layout and per-instance pre/post steps directly in `spector.config.yaml`
and drive it with the bare CLI. Each spec compiles using the committed
`tspconfig.yaml` in its output folder, then the hooks run.

```yaml
# spector.config.yaml
specsRoot: temp/specs # default for --specs-root
outputDir: generated/{outputPath} # {outputPath} = the outputPath option, defaulting to the spec key
compileConfig: tspconfig.yaml # compile using this committed config inside each output folder

hooks:
  # A shell command run once per spec. SPECTOR_OUTPUT_DIR points at the output
  # folder; SPECTOR_SPEC_PATH / SPECTOR_SPEC_NAME / SPECTOR_PHASE are also set.
  postCompile: node ./scripts/post-compile.js
  postCompileDeclarations: node ./scripts/emit-declarations.ts

specs:
  routes: true
  versioning/removed:
    - { options: { outputPath: versioning/removed/v1 } }
    - { options: { outputPath: versioning/removed/v2 } }
```

```bash
spector-runner --config spector.config.yaml --phase all
```

- **`compileConfig`** — when set, each compile runs with its output folder as the
  cwd and this file as `--config`, so the emitter and per-package options come
  from the committed config (no synthesized `--emit`/`--option`). Requires
  `outputDir` to locate each folder.
- **`hooks.postCompile`** — runs after each successful compile (the `compile` and
  `all` phases). Keep it a short, reusable script that reads `SPECTOR_OUTPUT_DIR`.
- **`hooks.postCompileDeclarations`** — runs per spec in the `declarations` phase
  (and at the end of `all`) **without recompiling**, for a follow-up build step
  over already-generated sources.
- **`--phase <all|compile|declarations>`** — pick which phase(s) to run. This lets
  a heavy declarations pass overlap with, say, an integration-test run:

  ```jsonc
  "generate-and-run": "npm run gen:client && concurrently \"npm run test\" \"npm run gen:declarations\"",
  "gen:client": "spector-runner --config spector.config.yaml --phase compile",
  "gen:declarations": "spector-runner --config spector.config.yaml --phase declarations",
  ```

## Config files & hooks

Emitters that need more than one spec root, local specs, or pre/post steps can
declare the **whole run** in a `spector-runner.config.{js,ts}` module instead of
a bespoke driver script. The `spector-runner` CLI loads it with `--config-file`
and runs it end-to-end: `preRun` → all scenarios compiled in parallel →
`postRun`, with `postScenario` after each compile.

```bash
spector-runner --config-file .scripts/spector-runner.config.js [--filter <regex>] [--jobs <n>] [--verbose]
```

```js
import { defineConfig, buildScenarios } from "@azure-tools/spector-runner";

export default defineConfig({
  cwd: emitterPackageRoot,
  jobs: 8,
  tspconfig: ".scripts/tspconfig.yaml", // stub --config for every compile

  // Either an array or a builder invoked with the run context. Compose several
  // spec roots by calling buildScenarios more than once and concatenating.
  scenarios: (ctx) => [
    ...buildScenarios({ config: "spector.config.http.yaml", specsRoot: httpSpecs, emit: ["."], outputDir }),
    ...buildScenarios({ config: "spector.config.azure.yaml", specsRoot: azureSpecs, emit: ["."], outputDir }),
    ...localSpecs, // hand-built CompileScenario[]
  ],

  // Lifecycle hooks (all optional, all awaited):
  preRun: (ctx) => syncExternalSpecs(),                 // one-time setup: sync/clone/clean
  postScenario: (result, ctx) => patchOrCleanup(result), // per-scenario post-processing
  postRun: (summary, ctx) => rollUpDeclarations(),      // follow-up step (not a tsp compile)
});
```

Hook and builder context (`RunHookContext`): `{ cwd, jobs, verbose, filter }` —
already reflecting CLI overrides, so a builder can skip work or a `preRun` can
adapt when the run is filtered. The CLI `--filter <regex>` filters the built
scenarios by `name` centrally.

`defineConfig` is an identity helper for type-checking/completion. `runConfig`
runs a config programmatically (`runConfig(config, { jobs, cwd, verbose, filter })`),
and `loadConfigFile(path)` imports a config module — useful when a `.ts` config
must run through `tsx` (e.g. the Python regenerator, whose config imports its
upstream-synced option tables).
