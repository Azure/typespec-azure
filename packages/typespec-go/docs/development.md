# Getting started

The `@azure-tools/typespec-go` package is the [TypeSpec](https://typespec.io) emitter that
generates client code for the [Azure SDK for Go](https://github.com/Azure/azure-sdk-for-go).
It lives in the [`Azure/typespec-azure`](https://github.com/Azure/typespec-azure) monorepo
under `packages/typespec-go`.

The emitter is composed of several sub-packages that live alongside it under `src/`:

- `src/codegen` — emits Go source from the code model.
- `src/codemodel` — the intermediate representation consumed by the code generator.
- `src/naming` — naming/casing helpers shared across the emitter.
- `src/tcgcadapter` — adapts the [TypeSpec Client Generator Core](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-client-generator-core)
  (TCGC) output into the code model.

> These sub-packages were previously published from `Azure/autorest.go`. They are now vendored
> into this package and maintained here; the copies under `Azure/autorest.go` are frozen.

This guide outlines the steps to contributing to the emitter.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Clone the repo](#step-1-clone-the-repo)
- [Step 2: Build the code](#step-2-build-the-code)
- [Step 3: Regenerate tests](#step-3-regenerate-tests)
- [Step 4: Test your changes](#step-4-test-your-changes)
  - [Run the Go tests](#run-the-go-tests)
  - [Lint the generated Go](#lint-the-generated-go)
  - [Debug](#debug)
- [Step 5: Review the generated-code diff](#step-5-review-the-generated-code-diff)
- [Step 6: Update emitter documentation](#step-6-update-emitter-documentation)
- [Step 7: Make a PR](#step-7-make-a-pr)

## Prerequisites

- [Node.js](https://nodejs.org/download/) (>= 22)
- [pnpm](https://pnpm.io/installation/)
- [Go](https://go.dev/doc/install)

The repo pins its tool versions in `mise.toml` at the repo root. If you use
[mise](https://mise.jdx.dev/), running `mise install` will provision the expected
versions of Node, Go, and the other tools.

## Step 1: Clone the repo

We recommend [forking then cloning](https://github.com/Azure/azure-sdk/blob/main/docs/policies/repobranching.md)
the repo.

```terminal
git clone https://github.com/<your-github-username>/typespec-azure.git
```

## Step 2: Build the code

From the repo root, install all dependencies:

```terminal
pnpm install
```

Then build the emitter with Turbo. Building through Turbo (rather than calling `tsc`
directly) ensures the package's workspace dependencies are built first and lets Turbo
cache unchanged builds:

```terminal
npx turbo run build --filter=@azure-tools/typespec-go
```

Use `pnpm watch` from the repo root to rebuild on change while you work.

## Step 3: Regenerate tests

The test fixtures under `test/` are generated from TypeSpec specs. After changing the
emitter, rebuild it and regenerate to see how your change affects the output.

From the `packages/typespec-go` directory:

```terminal
pnpm regenerate
```

To regenerate a single test, pass a `--filter` matching the test name (the value is treated
as a regular expression):

```terminal
pnpm regenerate --filter=TestName
```

The first run also syncs the Azure REST API specs and the generated-code baseline (see
[Step 5](#step-5-review-the-generated-code-diff)). To skip the baseline sync (for example
when working offline), set `TYPESPEC_GO_SKIP_BASELINE=1`.

## Step 4: Test your changes

### Run the Go tests

The Go end-to-end tests run against the [Spector](https://github.com/microsoft/typespec/tree/main/packages/spector)
mock server. Start it, run the tests, then stop it:

```terminal
pnpm spector --start
pnpm go-test
pnpm spector --stop
```

`pnpm go-test` discovers and runs `go test ./...` in every directory under `test/local/`
that contains `_test.go` files. The whole flow is also wired up as a single command:

```terminal
pnpm test:go:e2e
```

To run the emitter's own (TypeScript) unit tests:

```terminal
pnpm test
```

### Lint the generated Go

To run `golangci-lint` (and `shadow`) against every generated Go module under `test/local/`:

```terminal
pnpm lint:go
```

`golangci-lint` and `shadow` must be available on your `PATH` (CI installs them for you).

### Debug

To debug the emitter:

1. Set a breakpoint in the TypeScript source.
2. In the VS Code JavaScript Debug Terminal, run one of the regeneration commands from
   [Step 3](#step-3-regenerate-tests).

## Step 5: Review the generated-code diff

The committed test fixtures are mirrored into a baseline checkout so you can review the exact
delta your emitter change produces.

`pnpm regenerate` automatically:

1. Syncs the generated-code baseline from the
   [`Azure/azure-sdk-assets`](https://github.com/Azure/azure-sdk-assets) repo (branch
   `typespec-go`) into `temp/baseline/`.
2. After emit completes, mirrors the freshly generated `test/` artifacts into that checkout.

You can then inspect the change against the merged baseline with normal git commands:

```terminal
cd temp/baseline
git status
git diff
```

Set `TYPESPEC_GO_SKIP_BASELINE=1` to skip this (it is skipped in CI).

## Step 6: Update emitter documentation

If you changed the emitter options, regenerate the reference documentation. From the
`packages/typespec-go` directory:

```terminal
pnpm regen-docs
```

This writes the generated reference into the `typespec-azure` website content
(`website/src/content/docs/docs/emitters/clients/typespec-go/reference`). Commit the
regenerated files alongside your change.

## Step 7: Make a PR

Once you're satisfied with your changes, open a PR in the
[`Azure/typespec-azure`](https://github.com/Azure/typespec-azure/pulls) repo.

Before you do, make sure to:

1. Format your code (`pnpm format` from the repo root, or check with `pnpm format:check`).
2. Rebuild and regenerate everything so the committed fixtures reflect your change.
3. Add a changelog entry with [Chronus](https://github.com/microsoft/chronus) by running
   `npx chronus add` from the repo root and following the prompts. This creates a change
   file under `.chronus/changes/` that you should commit with your PR.
