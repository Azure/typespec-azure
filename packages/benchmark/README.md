# TypeSpec Azure Benchmark

Performance benchmarking tool for TypeSpec Azure compilation. Tracks compilation time with granular detail (loader, resolver, checker, per-linting-rule, per-emitter) and compares across runs to detect regressions.

## How it works

1. **Benchmark runner** measures compilation and each emitter independently using the compiler's programmatic API
2. The compiler provides built-in `Stats` data including per-stage timing and per-linter-rule breakdown
3. Runtime metrics are aggregated with an outlier-resistant estimator (trimmed mean for 5+ samples, median for smaller sample sizes)
4. Per-spec variability (standard deviation and coefficient of variation) is captured from raw iterations
5. Optional noise-gating retries compilation only; it never regenerates SDKs
6. PR baseline can be built from a rolling window of recent `main` results instead of only `latest.json`
7. Results are stored as JSON — on CI, they're saved to the `benchmark-data` branch
8. PR comments show a comparison table highlighting performance changes

## Local usage

### Run benchmarks

```bash
# Build the benchmark package (and its dependencies)
pnpm -r --filter "@azure-tools/typespec-benchmark..." build

# Install the Azure C# emitter from npm for this benchmark job/session
node packages/benchmark/scripts/setup-csharp.ts

# Compiler: 25 measurements + 3 warmups; each emitter: 3 measurements + 1 warmup
node packages/benchmark/dist/src/cli.js run --output results.json

# Run with custom options
node packages/benchmark/dist/src/cli.js run \
  --iterations 3 \
  --warmup 1 \
  --emitter-iterations 3 \
  --emitter-warmup 1 \
  --noise-cv-threshold 0.08 \
  --max-reruns 1 \
  --rerun-iterations 5 \
  --specs azure-core-dataplane,azure-arm-resource-manager \
  --output results.json
```

### Compare results

Comparisons require the same measurement method. The CLI rejects legacy combined
results versus split results instead of reporting methodological differences as
performance improvements or regressions.

```bash
# Console summary
node packages/benchmark/dist/src/cli.js compare \
  --baseline baseline.json \
  --current current.json

# Markdown table (for PR comments)
node packages/benchmark/dist/src/cli.js compare \
  --baseline baseline.json \
  --current current.json \
  --format markdown

# Show per-rule breakdown
node packages/benchmark/dist/src/cli.js compare \
  --baseline baseline.json \
  --current current.json \
  --detailed

# Only show notable changes (>5% threshold)
node packages/benchmark/dist/src/cli.js compare \
  --baseline baseline.json \
  --current current.json \
  --changes-only

# Custom threshold
node packages/benchmark/dist/src/cli.js compare \
  --baseline baseline.json \
  --current current.json \
  --threshold 10
```

## Benchmark specs

Located in `specs/`:

| Spec                         | Description                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `azure-core-dataplane`       | Data-plane service using Azure.Core operations, models, traits                  |
| `azure-arm-resource-manager` | ARM resource provider with tracked, proxy resources and multiple resource types |
| `azure-full`                 | Comprehensive data-plane service with many models, resources, and operations    |

### Emitter coverage

All built-in specs run AutoRest, OpenAPI3, Azure Python, generic JavaScript,
Azure TypeScript, Azure Java, Azure Go, Azure C#, and standalone TCGC. The Azure
services (`compute`, `network`, and `web`) run the same set **except OpenAPI3**:
the service corpus contains Azure-specific routes that OpenAPI3 cannot represent.
For example, Compute has a route with a query string.

Network also temporarily excludes Azure TypeScript (`@azure-tools/typespec-ts`):
its `P2sVpnGateways` and `P2SVpnGateways` client groups normalize to the same
generated file path and crash the emitter. Generic JavaScript remains enabled.
These exceptions are explicit in the coverage tests, not silent runtime skips.

These are **full-generation** benchmarks, including downstream generators and Go
post-generation tools, not just intermediate code-model generation. Install the
repo's Go, Java/Maven, Python/uv tools and .NET SDK 10.0.x before running. Locally,
use `mise exec --` for commands when mise is not activated in your shell.

All workspace emitters and TypeSpec/TCGC libraries run from this checkout.
`setup-csharp.ts` installs `@azure-typespec/http-client-csharp@latest` and its
published backend into the ignored `.emitters/` directory and links the Azure
emitter into the benchmark's `node_modules`. It disables npm peer installation
and verifies that TypeSpec/TCGC peers resolve to this workspace. Re-run setup to
refresh C#; it never changes the workspace manifest or lockfile.

The `latest` npm tag may point to a prerelease. Each result records the exact
Azure and base C# versions in `externalEmitterVersions`, because that dependency
can change independently of the benchmarked commit. Installation happens before
timing begins. Missing tools, unresolved emitters, and missing/invalid emitter
timings fail the run rather than silently reducing coverage.

The dashboard discovers emitters from result metrics; new emitter series start
with the first run that includes them. Existing history is only replaced when
explicitly backfilled with `--force`. Missing samples remain gaps, not zero-duration samples.

## CI integration

Benchmarks run **on push to `main`** (via `benchmark.yml` and `benchmark-external.yml`, each instantiating the reusable `benchmark-run.yml`). Each run stores its results to the `benchmark-data` branch via the `store-results` CLI command — the built-in specs under `results/` and the external specs under `external-results/`. Changes are monitored on the [benchmarks dashboard](https://azure.github.io/typespec-azure/benchmarks/); benchmarks do not run on pull requests.

The reusable workflow builds dependencies and installs C# once, then snapshots the
external specs and prepares an explicit workload plan. Independent jobs measure
each spec's compiler and each configured emitter. They reuse that prepared build
and source snapshot, rather than rebuilding packages or fetching a moving spec
branch for every job. Each job runs one workload serially, avoiding CPU/memory
contention between emitters on the same runner.

Both datasets use **25 compiler measurements + 3 warmups** and **3 full-generation
measurements + 1 warmup per emitter/spec**. Compiler noise retries do not affect
emitter sample counts. Workloads have a 30-minute execution limit; missing,
failed, duplicated, or mismatched workload results prevent publication rather
than silently reducing coverage. The end-to-end runtime target is under 30
minutes excluding runner queue delays; the job timeout is a failure boundary,
not evidence that the target was met.

The final job combines the complete matrix and publishes the same dashboard
metric labels as before. Manual runs upload the combined JSON as an artifact
without publishing feature-branch results to the production dashboard.

For local debugging, `run` executes the same workloads serially. To reproduce an
individual CI workload:

```bash
node packages/benchmark/dist/src/cli.js plan \
  --specs-dir packages/benchmark/external-spec --specs network --output plan.json
node packages/benchmark/dist/src/cli.js run-workload \
  --plan plan.json --workload network--azure-typespec-http-client-csharp --output csharp.json
```

### Data storage

Results are stored on the `benchmark-data` orphan branch:

- `results/<commit-sha>.json` — per-commit results
- `results/latest.json` — latest main baseline
- `results/history.json` — aggregated history for the website

`timestamp` records measurement completion; `commitTimestamp` records the source
commit's committer date. `latest.json` and history use the same Git topological
commit order, so late measurements, equal commit dates, or clock skew cannot move
the baseline backwards. Charts use commit dates rather than measurement dates.
Publication recovers metadata from Git for legacy results without rewriting their
original timestamp values, fetching missing source history when necessary.

### Backfill historical data

Build the current harness and install C# as shown above, then fetch the source
history before backfilling. The default source is `origin/main`, independently of
the branch containing the harness (so a fix branch can benchmark main's history).

```bash
# Fill missing results among the last 100 first-parent commits (default)
node packages/benchmark/dist/src/cli.js backfill

# Replace the last 10 results with the current emitter matrix, matching CI sampling
NODE_OPTIONS=--max-old-space-size=12288 node packages/benchmark/dist/src/cli.js backfill \
  --from 10 --force --iterations 25 --warmup 3 \
  --noise-cv-threshold 0.08 --max-reruns 1 --rerun-iterations 10 --push

# Backfill from a specific commit to the source branch tip
node packages/benchmark/dist/src/cli.js backfill --from abc1234

# Backfill an inclusive commit range (use the same SHA for exactly one commit)
node packages/benchmark/dist/src/cli.js backfill --from abc1234 --to def5678
```

The backfill command:

1. Resolves the selected commit range once and skips existing results unless `--force` is set.
2. Creates a fresh temporary worktree for each commit, leaving the caller's branch and dirty files untouched and preventing stale generated files from contaminating another commit.
3. Restores the current harness/configuration before installing and building each historical workspace's complete emitter dependencies.
4. Reuses the job's installed C# version with peers resolved against that historical workspace.
5. Keeps per-commit results and real build/generation logs in the printed temporary output directory. Any failed commit makes the command fail.
6. With `--push`, publishes each successful result immediately. Without it, retains the JSON files locally without changing branches.

Backfilled points retain both measurement time and historical commit time. Compiler
noise settings are forwarded exactly, including explicit zeros; CI uses the same
configured noise gate as normal runs. Publishing an older result
does not move `latest.json` backwards, and concurrent writers regenerate history
against the latest data branch rather than rebasing conflicting generated JSON.

The `Benchmark` workflow exposes `backfill_from`, `backfill_to`, `backfill_force`,
compiler `iterations`/`warmup`, and `emitter_iterations`/`emitter_warmup`. Backfill runs have separate concurrency groups from
normal main runs. For a large full-generation backfill, dispatch one SHA per run
(`backfill_from` and `backfill_to` equal) to avoid one job hitting the execution
time limit. Use a separate `branch` input to smoke-test publication without
changing dashboard data. Results and logs are also uploaded as workflow artifacts.

## What gets measured

The TypeSpec compiler provides built-in `Stats` covering:

- **Complexity**: number of types created and finished
- **Runtime breakdown**:
  - `loader` — time to load and parse source files
  - `resolver` — time to resolve names
  - `checker` — time to type-check
  - `validation` — per-validator timing (compiler, @typespec/http, @typespec/versioning, etc.)
  - `linter` — per-rule timing (e.g., `@azure-tools/typespec-azure-core/auth-required`)
  - `emit` — per-emitter timing with per-step breakdown

New results use `measurementMode: "split"`. `iterations`, `rawIterations`, and
compiler variability describe compilation-only samples (`noEmit: true`).
`emitterMeasurements` records each emitter's actual sample/warmup counts, raw
timings, variability, and runner. Emitter timings do not include recompilation
or process startup, although the workload log reports end-to-end elapsed time.
The aggregate `emit` value is the sum of independently aggregated emitter times,
not the wall time of parallel jobs.

Unlike legacy combined runs, compiler complexity excludes emitter mutations and
compilation-only runs skip loading emitter modules. Emitters run in
isolation without another emitter's cached state. Treat the switch to split
measurement as a methodology change when comparing against old results.
Existing history remains readable and is not rewritten automatically.
Dashboard baseline comparisons only use runs with the same measurement method,
so this transition is not presented as a compiler or emitter performance regression.
When a metric is absent from the last run, its comparison window and method are
anchored to the last non-null sample that actually supplies its displayed value.

## Benchmark specs

A benchmark spec is anything the runner can compile and measure. There are two kinds, discovered from whatever directory `--specs-dir` points at:

- **Local spec** — a subdirectory containing a `main.tsp` (and usually a `tspconfig.yaml`). The built-in specs under `specs/` are local specs.
- **External spec** — a directory with a `spec.json` (and a `tspconfig.yaml`) describing a spec that lives in another repository (see below).

The runner treats both kinds uniformly and writes a single results file. What to run and how to display it is decided by the caller (CI job / dashboard), not by the runner — e.g. CI runs `--specs-dir specs` and `--specs-dir external-spec` separately and stores them in separate results directories.

### Adding a local spec

1. Create a new directory under `specs/` (e.g., `specs/my-new-spec/`)
2. Add a `main.tsp` file with your TypeSpec code
3. Add a `tspconfig.yaml` with emitter and linter configuration
4. The runner auto-discovers spec directories — no registration needed

### Adding an external spec (e.g. from azure-rest-api-specs)

External specs live in another repository (such as [azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs)) and are not copied into this repo. They are sparse-checked-out into `packages/benchmark/.external/` (git-ignored) and compiled against **this workspace's** packages, so the measurement reflects your local source changes (e.g. to TCGC or a client emitter) rather than the published npm versions.

Each external spec is **one directory** under `external-spec/` (the directory name is the benchmark name), containing two files:

- `spec.json` — where to get the spec source.
- `tspconfig.yaml` — the compiler config (emitters + linter) to measure; it is copied into the checkout, replacing the spec's own tspconfig.

`external-spec/web/spec.json`:

```json
{
  "repository": "https://github.com/Azure/azure-rest-api-specs.git",
  "ref": "main",
  "path": "specification/web/resource-manager/Microsoft.Web/AppService"
}
```

- `repository` / `ref` — the repo and git ref to sparse-checkout; `ref` tracks latest (e.g. `main`), no pinning.
- `path` — the entry directory (containing `main.tsp`) relative to the repo root. The spec's own `main.tsp` is the entrypoint (it imports `client.tsp`).
- `checkoutPath` (optional) — directory to sparse-checkout, when the spec imports sibling folders (e.g. `../common`). Defaults to `path`.
- `name` (optional) — overrides the benchmark name (defaults to the directory name).

`external-spec/web/tspconfig.yaml` selects what to measure: the client emitters,
AutoRest, and standalone TCGC, plus the ARM ruleset. The checked-in config also
supplies package names and namespaces for each language:

```yaml
emit:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-python"
  - "@typespec/http-client-js"
  - "@azure-tools/typespec-ts"
  - "@azure-tools/typespec-java"
  - "@azure-tools/typespec-go"
  - "@azure-typespec/http-client-csharp"
  - "@azure-tools/typespec-client-generator-core"
linter:
  extends:
    - "@azure-tools/typespec-azure-rulesets/resource-manager"
```

Run the external specs (fewer iterations and a larger Node heap, since they are
heavy). CI also sets this heap limit through `NODE_OPTIONS` so the isolated
iteration processes inherit it:

```bash
NODE_OPTIONS=--max-old-space-size=12288 node packages/benchmark/dist/src/cli.js run \
  --specs-dir packages/benchmark/external-spec \
  --warmup 0 --iterations 1 \
  --output external.json
```

To evaluate the impact of a change, rebuild the workspace at each revision and compare:

```bash
# revision A: build, then run
node packages/benchmark/dist/src/cli.js run --specs-dir packages/benchmark/external-spec --output before.json
# revision B: rebuild, then run
node packages/benchmark/dist/src/cli.js run --specs-dir packages/benchmark/external-spec --output after.json
node packages/benchmark/dist/src/cli.js compare --baseline before.json --current after.json --detailed
```

> **Notes**
>
> - The spec's own `tspconfig.yaml` is replaced by the one in the external-spec directory, so the emitters and linter measured are exactly what you configure there.
> - A spec that imports a package not declared in `packages/benchmark/package.json` will fail to resolve — add the package to the benchmark's dependencies or pick a compatible spec.
> - Per-emitter time is reported under `emit/<emitter-name>` (the top-level `total` metric excludes emit time).
