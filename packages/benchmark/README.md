# TypeSpec Azure Benchmark

Performance benchmarking tool for TypeSpec Azure compilation. Tracks compilation time with granular detail (loader, resolver, checker, per-linting-rule, per-emitter) and compares across runs to detect regressions.

## How it works

1. **Benchmark runner** compiles dedicated TypeSpec specs using the compiler's programmatic API
2. The compiler provides built-in `Stats` data including per-stage timing and per-linter-rule breakdown
3. Runtime metrics are aggregated with an outlier-resistant estimator (trimmed mean for 5+ samples, median for smaller sample sizes)
4. Per-spec variability (standard deviation and coefficient of variation) is captured from raw iterations
5. Optional noise-gating can auto-run extra iterations when variance is high
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

# Run all benchmark specs (5 iterations + 1 warmup by default)
node packages/benchmark/dist/src/cli.js run --output results.json

# Run with custom options
node packages/benchmark/dist/src/cli.js run \
  --iterations 3 \
  --warmup 1 \
  --noise-cv-threshold 0.08 \
  --max-reruns 1 \
  --rerun-iterations 5 \
  --specs azure-core-dataplane,azure-arm-resource-manager \
  --output results.json
```

### Compare results

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
with the first run that includes them. Existing history is not backfilled or
rewritten. Its missing emitter samples remain gaps, not zero-duration samples.

## CI integration

Benchmarks run **on push to `main`** (via `benchmark.yml` and `benchmark-external.yml`, each instantiating the reusable `benchmark-run.yml`). Each run stores its results to the `benchmark-data` branch via the `store-results` CLI command — the built-in specs under `results/` and the external specs under `external-results/`. Changes are monitored on the [benchmarks dashboard](https://typespec.io/benchmarks); benchmarks do not run on pull requests.

### Data storage

Results are stored on the `benchmark-data` orphan branch:

- `results/<commit-sha>.json` — per-commit results
- `results/latest.json` — latest main baseline
- `results/history.json` — aggregated history for the website

### Backfill historical data

The historical backfill command's package restoration predates the expanded
client-emitter matrix. It does not provision the full client set or npm C#;
the full-generation coverage above applies to normal runs only.

To backfill benchmark results for past commits:

```bash
# Backfill last 100 commits (default)
node packages/benchmark/dist/src/cli.js backfill

# Backfill last 50 commits, then push
node packages/benchmark/dist/src/cli.js backfill --from 50 --push

# Backfill from a specific commit to HEAD of main
node packages/benchmark/dist/src/cli.js backfill --from abc1234

# Backfill a specific commit range
node packages/benchmark/dist/src/cli.js backfill --from abc1234 --to def5678
```

The backfill command:

1. Builds and saves the current benchmark CLI
2. Checks out each historical commit, builds its dependencies, and runs benchmarks using the saved CLI
3. Skips commits that already have results on the `benchmark-data` branch
4. Commits all new results to the `benchmark-data` branch

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
