# TypeSpec Azure Benchmark

Performance benchmarking tool for TypeSpec Azure compilation. Tracks compilation time with granular detail (loader, resolver, checker, per-linting-rule, per-emitter) and compares across runs to detect regressions.

## How it works

1. **Benchmark runner** compiles dedicated TypeSpec specs using the compiler's programmatic API
2. The compiler provides built-in `Stats` data including per-stage timing and per-linter-rule breakdown
3. Results are stored as JSON — on CI, they're saved to the `benchmark-data` branch
4. PR comments show a comparison table highlighting performance changes

## Local usage

### Run benchmarks

```bash
# Build the benchmark package (and its dependencies)
pnpm -r --filter "@azure-tools/typespec-benchmark..." build

# Run all benchmark specs (5 iterations + 1 warmup by default)
node packages/benchmark/dist/src/cli.js run --output results.json

# Run with custom options
node packages/benchmark/dist/src/cli.js run \
  --iterations 3 \
  --warmup 1 \
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

## CI integration

The `.github/workflows/benchmark.yml` workflow:

- **On push to `main`**: Runs benchmarks and stores results to the `benchmark-data` branch
- **On pull requests**: Runs benchmarks, compares with the latest `main` baseline, and posts a sticky PR comment with the comparison table

### Data storage

Results are stored on the `benchmark-data` orphan branch:

- `results/<commit-sha>.json` — per-commit results
- `results/latest.json` — latest main baseline

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

## Adding a new benchmark spec

1. Create a new directory under `specs/` (e.g., `specs/my-new-spec/`)
2. Add a `main.tsp` file with your TypeSpec code
3. Add a `tspconfig.yaml` with emitter and linter configuration
4. The runner auto-discovers spec directories — no registration needed
