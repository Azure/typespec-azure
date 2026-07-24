# Getting started

The `@azure-tools/typespec-go` package is the [TypeSpec](https://typespec.io) emitter that generates client code for the [Azure SDK for Go](https://github.com/Azure/azure-sdk-for-go). It lives in the [`Azure/typespec-azure`](https://github.com/Azure/typespec-azure) monorepo under `packages/typespec-go`.

The emitter is composed of several sub-packages that live alongside it under `src/`:

- `src/codegen` — emits Go source from the code model.
- `src/codemodel` — the intermediate representation consumed by the code generator.
- `src/naming` — naming/casing helpers shared across the emitter.
- `src/tcgcadapter` — adapts the [TypeSpec Client Generator Core](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-client-generator-core) (TCGC) output into the code model.

This guide outlines the steps to contributing to the emitter.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Clone the repo](#step-1-clone-the-repo)
- [Step 2: Build the code](#step-2-build-the-code)
- [Step 3: Test your changes](#step-3-test-your-changes)
  - [Choosing where to add a test](#choosing-where-to-add-a-test)
  - [Write an emitter unit test (scenario)](#write-an-emitter-unit-test-scenario)
  - [Regenerate the Go fixtures](#regenerate-the-go-fixtures)
  - [Diff the regenerated code](#diff-the-regenerated-code)
  - [Run the Go tests](#run-the-go-tests)
  - [Lint the generated Go](#lint-the-generated-go)
  - [Debug](#debug)
- [Step 4: Update emitter documentation](#step-4-update-emitter-documentation)
- [Step 5: Make a PR](#step-5-make-a-pr)

## Prerequisites

- [Node.js](https://nodejs.org/download/) (>= 22)
- [pnpm](https://pnpm.io/installation/)
- [Go](https://go.dev/doc/install)

The repo pins its tool versions in `mise.toml` at the repo root. If you use [mise](https://mise.jdx.dev/), running `mise install` will provision the expected versions of Node, Go, and the other tools.

## Step 1: Clone the repo

We recommend [forking then cloning](https://github.com/Azure/azure-sdk/blob/main/docs/policies/repobranching.md) the repo.

```terminal
git clone https://github.com/<your-github-username>/typespec-azure.git
```

## Step 2: Build the code

From the repo root, install all dependencies:

```terminal
pnpm install
```

Then build the emitter and its workspace dependencies with Turbo (via the `build:deps` script). Building through Turbo (rather than calling `tsc` directly) ensures the package's workspace dependencies are built first and lets Turbo cache unchanged builds. From the `packages/typespec-go` directory:

```terminal
pnpm build:deps
```

(`pnpm build` alone only compiles this package with `tsc` and assumes the dependencies are already built.)

Use `pnpm watch` from the repo root to rebuild on change while you work.

## Step 3: Test your changes

`test/` holds three kinds of tests, described in [Choosing where to add a test](#choosing-where-to-add-a-test) below. Verifying an emitter change means writing or updating the appropriate test and — for anything that runs against generated Go — regenerating the fixtures, then running the Go tests and the linter. The subsections below go from the cheapest, in-memory unit tests to the heavier tests that execute generated Go.

### Choosing where to add a test

The emitter has three kinds of tests. **Prefer the cheapest one that can verify your change**, and reach for a local Go test only when nothing else can:

1. **Emitter unit tests (scenarios)** — `test/unittest/scenarios/*.md`. **This is the default and should cover the large majority of changes.** Each scenario compiles a small TypeSpec in memory and snapshots the generated Go source, so it runs in-process with no Go toolchain and no mock server. Use a scenario for anything that can be verified by inspecting generated code: naming/casing, models and serialization, client and options shapes, request/response building, polymorphism, client customizations, sample generation, emitter options, and so on. See [Write an emitter unit test (scenario)](#write-an-emitter-unit-test-scenario).

2. **External spec tests (Spector)** — `test/http-specs` and `test/azure-http-specs`. Hand-written Go client tests that run against the [Spector](https://github.com/microsoft/typespec/tree/main/packages/spector) mock API server, driven by the upstream `@typespec/http-specs` / `@azure-tools/azure-http-specs` scenarios. Use these for end-to-end client behavior that must exercise a real HTTP round-trip against a shared, externally-defined spec. These run against generated Go, so [regenerate the fixtures](#regenerate-the-go-fixtures) first, then [run the Go tests](#run-the-go-tests).

3. **Local spec tests (last resort — avoid adding new ones)** — a spec under `test/tsp/<Name>` generated into `test/local/<name>` and verified by a hand-written `_test.go`. Only use a local spec test when the behavior can **only** be verified by executing the generated Go at runtime **and** cannot be expressed as a Spector case. Because they require generating and compiling a dedicated Go module, they are the slowest and heaviest tests to maintain. As of this writing only two remain, both testing runtime behavior that has no code-to-inspect equivalent:

   - `gogenerate` — verifies the post-generation `go generate` hook.
   - `fakeserver` — verifies fake-server runtime behavior (context cancellation, dispatch races, and path/query decoding).

   Do **not** add a local spec test for a code-generation change; write a scenario unit test instead. If you do need a local spec test, keep its spec as small as possible and don't duplicate behavior already covered by a scenario.

### Write an emitter unit test (scenario)

Scenarios live in `test/unittest/scenarios/`, one `.md` file per behavior (keep each file focused on a single behavior). A scenario mixes input and expected-output fenced code blocks, routed by the info string after the opening fence:

- ` ```tsp ` — the TypeSpec to compile (wrapped as `main.tsp`). The common Azure libraries and their `using`s are already in scope; ARM specs are auto-detected and routed to an ARM-enabled tester. Don't add `import`/`using` statements — put everything the spec needs inline.
- ` ```yaml ` — emitter options for the compile, as kebab-case keys (for example `generate-samples: true`, `containing-module: foo/bar`, `file-prefix: zz_`).
- ` ```json <path> ` — an extra input file written verbatim into the in-memory file system at `<path>`. This is how additional compiler inputs are supplied by filename; for example ` ```json examples/Foo.json ` provides the example JSON that drives sample generation.
- ` ```go <name> ` — a snapshot of a generated Go file, matched by base name. It supports subdirectories (`fake/widget_server`) and sample files (`widgets_client_example_test`). Example (`*_example_test.go`) output is checked with the same `go <name>` block as any other generated file.

Order a scenario input-first so it reads top-to-bottom: `yaml` config, then `tsp`, then any `json` inputs, then the `go` output blocks.

**Every scenario needs at least one ` ```go <name> ` output block** — the harness only (re)generates the content of those blocks. Add one per generated file you want to snapshot; the body can start empty (or `// (file was not generated)`) and be filled by the update command below. A scenario with only a `tsp` block produces no Go and fails with an explicit "has at least one output block" error that lists the block names its input would produce, so you can copy one in.

Snapshots are formatted with `gofmt -s` (the same formatting the emitter applies after emit), so running these unit tests requires the Go toolchain on your `PATH`.

To fill (or refresh) the output blocks from the current emitter, run the update command and review the produced snapshots as part of your change:

```terminal
pnpm test:update
```

(This is `pnpm test` with `SCENARIOS_UPDATE=true`; it rewrites the output blocks in each `.md` in place. It also regenerates the per-scenario vitest suites first, so a newly added `.md` is picked up automatically.)

Each `.md` is backed by a generated vitest suite under `test/unittest/scenario-suites/` (one per scenario, so each shows up as its own group in the report). `pnpm test:update` regenerates these for you; if you add, remove, or rename a scenario without running it, regenerate them explicitly:

```terminal
pnpm gen:scenario-suites
```

A guard test (`scenario-suites.guard.test.ts`) fails if the suites drift from the set of `.md` files. Run all TypeScript unit tests (scenarios plus the emitter's own tests) with:

```terminal
pnpm test
```

### Regenerate the Go fixtures

The remaining subsections work with the committed Go fixtures, which the Spector and local spec tests run against. `pnpm tspcompile` runs the emitter over the local specs under `test/tsp/` and the external Spector specs, writing the generated Go into `test/local/`, `test/http-specs/`, and `test/azure-http-specs/`. Run it after changing the emitter so the fixtures (and the Go tests below) reflect your change. It does not touch the in-memory unit tests under `test/unittest/`.

From the `packages/typespec-go` directory:

```terminal
pnpm tspcompile
```

To regenerate a single test, pass a `--filter` matching the test name (the value is treated as a regular expression):

```terminal
pnpm tspcompile --filter=TestName
```

The first run also syncs the Azure REST API specs into `temp/`. The generated Go fixtures are not committed (they are `.gitignore`d), so validate your change by running the Go tests and linter below rather than by diffing the fixtures.

### Diff the regenerated code

Because the fixtures are not committed, a plain `git diff` won't show how your emitter change affects the generated Go. To review that impact, `pnpm diff-regen-code` regenerates the code twice — once from a **baseline** emitter and once from your working tree (**head**) — and renders the difference as a clickable HTML report plus a terminal summary. It wraps the language-agnostic [`emitter-diff`](https://github.com/microsoft/typespec/tree/main/eng/emitter-diff) tool that lives in the `core` submodule, running `pnpm tspcompile` in each tree and diffing `test/http-specs`, `test/azure-http-specs`, and `test/local`.

Build your working tree first (`pnpm build:deps` above) — head is run as-is and never rebuilt for you. The baseline defaults to `main` and is fetched from GitHub and prepared (submodule init, install, build) automatically. From the `packages/typespec-go` directory:

```terminal
pnpm diff-regen-code
```

Everything after a `--` is forwarded to the tool; a second `--` forwards to `tspcompile`, so you can diff a subset or pick a different baseline. For example, to diff only one test, or against a specific commit:

```terminal
pnpm diff-regen-code -- -- --filter=TestName
pnpm diff-regen-code -- --baseline gh:<sha>
```

This is the same tool the `go / emitter diff` PR check runs to post an informational diff of your emitter change; it never fails on a diff, only on a build/tool error.

### Run the Go tests

The Spector-backed specs under `test/http-specs/` and `test/azure-http-specs/` exercise the [Spector](https://github.com/microsoft/typespec/tree/main/packages/spector) mock server, while the local Go tests under `test/local/` (for example `fakeserver` and `gogenerate`) run standalone. All of them run against the fixtures produced by [Regenerate the Go fixtures](#regenerate-the-go-fixtures), so regenerate first. Start the mock server, run the tests, then stop it:

```terminal
pnpm spector --start
pnpm go-test
pnpm spector --stop
```

`pnpm go-test` discovers and runs `go test ./...` in every directory under `test/local/`, `test/http-specs/`, and `test/azure-http-specs/` that contains `_test.go` files. The whole flow is also wired up as a single command:

```terminal
pnpm test:go:e2e
```

### Lint the generated Go

To run `golangci-lint` (and `shadow`) against every generated Go module under `test/local/`, `test/http-specs/`, and `test/azure-http-specs/`:

```terminal
pnpm lint:go
```

`golangci-lint` and `shadow` must be available on your `PATH`. For local runs you need to install them yourself, matching the versions CI uses (see `.github/workflows/ci-go.yml`):

```terminal
go install golang.org/x/tools/go/analysis/passes/shadow/cmd/shadow@latest
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b "$(go env GOPATH)/bin" v2.11.4
```

Make sure `$(go env GOPATH)/bin` is on your `PATH` so both tools are discoverable. On Windows, install `shadow` the same way and download the matching `golangci-lint` release from the [golangci-lint releases page](https://github.com/golangci/golangci-lint/releases).

### Debug

To debug the emitter:

1. Set a breakpoint in the TypeScript source.
2. In the VS Code JavaScript Debug Terminal, run `pnpm tspcompile` (optionally with `--filter`) from the [Regenerate the Go fixtures](#regenerate-the-go-fixtures) section.

## Step 4: Update emitter documentation

If you changed the emitter options, regenerate the reference documentation. From the `packages/typespec-go` directory:

```terminal
pnpm regen-docs
```

This writes the generated reference into the `typespec-azure` website content (`website/src/content/docs/docs/emitters/clients/typespec-go/reference`). Commit the regenerated files alongside your change.

## Step 5: Make a PR

Once you're satisfied with your changes, open a PR in the [`Azure/typespec-azure`](https://github.com/Azure/typespec-azure/pulls) repo.

Before you do, make sure to:

1. Format your code (`pnpm format` from the repo root, or check with `pnpm format:check`).
2. Rebuild and regenerate everything so the committed fixtures reflect your change.
3. Add a changelog entry with [Chronus](https://github.com/microsoft/chronus) by running `pnpm change add` from the repo root and following the prompts. This creates a change file under `.chronus/changes/` that you should commit with your PR.
