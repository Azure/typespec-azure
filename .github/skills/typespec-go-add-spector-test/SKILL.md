---
name: typespec-go-add-spector-test
description: >
  Adds a Spector mock API test for the typespec-go emitter. Use when given a Spector
  case link (http-specs or azure-http-specs) to opt the spec into generation, write
  Go client tests, and validate them against the Spector mock server.
allowed-tools: shell
---

# Add a Spector Test for typespec-go

## Inputs

You will receive a Spector case link under one of these roots:

- `https://github.com/microsoft/typespec/tree/main/packages/http-specs/specs/...`
- `https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs/specs/...`

## Output

- An opt-in entry in `packages/typespec-go/spector.config.http.yaml` or
  `packages/typespec-go/spector.config.azure.yaml`.
- Generated Go client code under `packages/typespec-go/test/http-specs/` or
  `packages/typespec-go/test/azure-http-specs/`.
- Hand-written `*_client_test.go` files that exercise the generated client against the
  Spector mock API server. Create one test file per generated `zz_*_client.go` file.

## Workflow

- [ ] Ensure dependencies are installed and `typespec-go` is built.
- [ ] Identify the Spector case, spec type, and spec path.
- [ ] Add the spec to the appropriate opt-in Spector config.
- [ ] Regenerate the selected Go client with `pnpm tspcompile --filter=<module>`.
- [ ] Read `mockapi.ts` and the generated client method signatures.
- [ ] Write one `*_client_test.go` file per generated client.
- [ ] Start Spector, run the generated module's Go tests, and stop Spector.

## Prerequisites

Run commands from the repository root unless a step specifies otherwise:

```bash
pnpm install
cd packages/typespec-go
pnpm build:deps
```

`pnpm build:deps` builds `typespec-go` and its workspace dependencies through Turbo. Do
not substitute `pnpm build`, which assumes those dependencies are already built.

## 1. Identify the Spec

Determine the spec type from the link:

- `microsoft/typespec/.../packages/http-specs/specs/<path>` uses
  `spector.config.http.yaml` and generates to `test/http-specs/`.
- `Azure/typespec-azure/.../packages/azure-http-specs/specs/<path>` uses
  `spector.config.azure.yaml` and generates to `test/azure-http-specs/`.

The spec path is the portion after `specs/`. For example,
`type/model/empty` is the path for
`.../packages/http-specs/specs/type/model/empty`.

Search the matching `spector.config.*.yaml` file before adding an entry. If it is
already enabled, retain its existing configuration and proceed to the test work.

## 2. Opt Into Generation

Spector selection is opt-in. Do not add or modify hard-coded external Spector groups in
`.scripts/tspcompile.js`; it loads and resolves the two YAML config files.

Add an enabled entry under `specs`, providing a unique Go module name in `options.module`.
Use lowercase names without hyphens and retain the conventional `group` suffix:

```yaml
specs:
  "type/model/empty": { options: { module: emptygroup, single-client: true } }
```

For Azure specs that require a particular `.tsp` file, include it in the key:

```yaml
specs:
  "azure/client-generator-core/api-version/header/client.tsp":
    { options: { module: apiversionheadergroup } }
```

Emitter options belong in the same `options` object and are passed as
`@azure-tools/typespec-go` emitter options. `module` is required. A single spec may
produce multiple test modules by supplying a list of option objects:

```yaml
specs:
  "azure/versioning/previewVersion":
    - options: { module: previewversiongroup, api-version: "2024-12-01-preview" }
    - options: { module: previewversiongroupspecificversion, api-version: "2024-06-01" }
```

Do not override the generation-owned `module`, `emitter-output-dir`, or `file-prefix`
options; set only this config's required `module` value. Per-test emitter defaults such as
`generate-fakes`, `inject-spans`, `head-as-boolean`, and `fix-const-stuttering` may be
overridden when the test needs it.

When a known unsupported spec should be explicitly tracked but not generated, add it as
`false` with a nearby comment linking the issue:

```yaml
# requires union support: https://github.com/Azure/autorest.go/issues/1234
"type/union": false
```

## 3. Generate the Client

From `packages/typespec-go`, regenerate only the new module:

```bash
pnpm tspcompile --filter=emptygroup
```

`--filter` is a regular expression matched against module names. The generator derives
the output path from the spec path and module name. Confirm the resulting module contains
the expected `zz_*_client.go` files. Do not edit generated `zz_*` files.

If the generated module requires dependencies that are absent from its `go.sum`, run:

```bash
cd test/<http-specs|azure-http-specs>/<spec-parent-path>/<module>
go mod tidy
```

Generated Go fixtures are ignored by git. Commit the opt-in config and hand-written test
files, not generated output.

## 4. Read the Mock API and Generated Surface

Read the upstream `mockapi.ts` for the selected spec:

- HTTP specs: `packages/typespec-go/node_modules/@typespec/http-specs/specs/<spec-path>/mockapi.ts`
- Azure HTTP specs: `packages/typespec-go/node_modules/@azure-tools/azure-http-specs/specs/<spec-path>/mockapi.ts`

For each scenario, match the expected URI, method, request body, headers, query and path
parameters, plus response status, headers, and body. Then inspect the generated
`zz_*_client.go` file for the exact client constructor, method names, and parameter types.

## 5. Write Go Client Tests

Create one hand-written `<name>_client_test.go` for every generated
`zz_<name>_client.go`. The test package is `<module>_test`; use `require`, not `assert`.

```go
package emptygroup_test

import (
	"context"
	"emptygroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEmptyClientGetEmpty(t *testing.T) {
	client, err := emptygroup.NewEmptyClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.GetEmpty(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
```

Use `http://localhost:3000` for every Spector client. For sub-clients, construct the
root client and access the sub-client from it. Common assertion patterns:

- 204 responses: `require.Zero(t, resp)`.
- Response bodies: `require.EqualValues(t, expected, resp.<Field>)`.
- Pointer fields: `to.Ptr(value)` from `github.com/Azure/azure-sdk-for-go/sdk/azcore/to`.
- Time values: `require.WithinDuration(t, expected, actual, 0)`.
- Pagers: iterate with `pager.More()` and `pager.NextPage(context.Background())`.
- LROs: call `poller.PollUntilDone(context.Background(), nil)`.

## 6. Validate Against Spector

From `packages/typespec-go`, start the mock server:

```bash
pnpm spector --start
```

Then run the selected module's tests:

```bash
cd test/<http-specs|azure-http-specs>/<spec-parent-path>/<module>
go test -v ./...
```

Stop the server when validation completes:

```bash
pnpm spector --stop
```

For full generated Go test coverage, use `pnpm test:go:e2e`. If a focused test fails,
verify the server is running, the endpoint is `http://localhost:3000`, the test matches
`mockapi.ts`, and the generated method signature was used correctly.

Run `pnpm lint:go` after regeneration when `golangci-lint` and `shadow` are available on
`PATH`. This lint command covers all generated Go modules, including the new Spector test.

## Notes

- Each generated test group is an independent Go module.
- Hand-written Go tests are the source of truth; regeneration can replace generated files.
- Keep config entries organized with the existing logical/alphabetical layout.
- The config format is standardized across emitters. Keep selection and per-spec options
  together in the relevant `spector.config.*.yaml` file.
