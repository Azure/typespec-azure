# @azure-tools/typespec-azure-examples

Tooling for the Azure **unified examples format** (`examples.yaml`): the published JSON Schema
and the `tsp-examples` CLI, plus the transitional `tsp-examples-migrate` and
`tsp-examples-legacy-expand` tools.

The unified examples format replaces the ~282K per-version `x-ms-examples` JSON files with a
single version-aware `examples.yaml` per service (or `examples/<Interface>.yaml` for large
services). See the RFC: _Unified Examples Format_.

## Format

```yaml
$schema: https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/schemas/examples.schema.yaml
$namespace: Microsoft.EventGrid

CaCertificates.get:
  - request:
      path:
        subscriptionId: 8f6b6269-84f2-4d09-9e31-1127efcd1e40
        resourceGroupName: myResourceGroup
    responses:
      200:
        body:
          name: exampleCaCertificate
          properties:
            provisioningState: Succeeded
  - since: "2023-12-15-preview"
    request:
      path:
        subscriptionId: 8f6b6269-84f2-4d09-9e31-1127efcd1e40
        resourceGroupName: myResourceGroup
    responses:
      200:
        body:
          name: exampleCaCertificate
          properties:
            provisioningState: Succeeded
            delegatedIdentityTokenExpirationTimeInUtc: "2023-10-12T23:06:43+00:00"
```

- File metadata uses `$`-prefixed keys (`$schema`, `$namespace`); every bare top-level key is an
  operation, identified by its interface-relative name (`Interface.operation`).
- Each operation maps to a list of example variants. The base variant has no `since`; later
  variants carry a quoted `since` and restate the full request/response.
- Response status codes are bare integer keys. `api-version` is implicit; use the
  `{api-version}` placeholder where a version must be embedded in a value.

## `tsp-examples validate`

Validate a service's example files against the JSON Schema and the format rules:

```bash
tsp-examples validate <service-dir>
```

It discovers `examples.yaml` and `examples/*.yaml` in the directory, reads the adjacent
`service.yaml` for version metadata, and reports diagnostics. It exits non-zero if any error is
found (use `--warn-as-error` to also fail on warnings).

### Rules enforced

- Only `$schema`/`$namespace` may be `$`-prefixed; other bare keys are operations that must be a
  list of examples.
- Response keys are integer status codes; range keys (`2XX`) and `default` are rejected.
- `since` must be a quoted string and a version listed in `service.yaml`.
- Per lineage (entries grouped by `title`; untitled entries form the default lineage): at most one
  entry without `since`, and `since` values are unique.
- An operation's full example set lives in a single file, and each interface appears in exactly
  one file.
- `{api-version}` is the only supported placeholder, and `api-version` must not appear as a
  request parameter.

## `tsp-examples add`

Add examples for a **newly-introduced API version**, adding an entry only where it is actually
needed:

```bash
tsp-examples add < service-dir > [--api-version < version > ]
```

For each operation in the target version's Swagger, `add` diffs the operation's contract against the
previous version (parity with OpenAPI-diff / `oad`) and:

- **unchanged** → does nothing (the existing lineage already resolves forward);
- **changed** (parameters, request body, or a response shape differ) → appends a
  `since: <target>` variant **cloned** from the operation's previous example, so you only edit the
  delta;
- **new operation** → adds a schema-shaped skeleton entry to fill in.

The target version defaults to the newest one in `service.yaml`; override it with `--api-version`.
The command is idempotent (re-running adds nothing) and validates its output. Use `--dry-run` to
preview the updated files. The change detection reads the emitted Swagger during rollout; results
are written back into the existing `examples.yaml` / `examples/*.yaml`.

## `tsp-examples-migrate`

> **Transitional tool.** Used to bulk-convert existing specs during rollout; it will be removed
> once services author `examples.yaml` directly.

Convert a service's existing `x-ms-examples` JSON into the unified format:

```bash
tsp-examples-migrate <spec-dir> --out <service-dir>
```

It crawls the versioned Swagger under `<spec-dir>` (the `stable/<version>/` and
`preview/<version>/` layout), follows each operation's `x-ms-examples` `$ref`, and emits a single
`examples.yaml` (or `examples/<Interface>.yaml` with `--split-by-interface`). The generated output
is validated with the same rules as `tsp-examples validate` before it is written.

If a `service.yaml` sits in `<spec-dir>` (or is passed with `--service`), its version list is
treated as authoritative: it defines the version order and any on-disk swagger version _not_ listed
there is ignored, so every generated `since` references a real service version.

What it does:

- Derives interface-relative operation keys from the Swagger `operationId` (`CaCertificates_Get` →
  `CaCertificates.get`) under a single `$namespace` (detected from `/providers/<Namespace>/`, or
  set with `--namespace`).
- Buckets each example parameter into `request.path` / `query` / `headers` / `body` using the
  operation's declared parameter locations, and drops the implicit `api-version`.
- Normalizes embedded version strings (in `Location`, `Azure-AsyncOperation`, `nextLink`, ...) to
  the `{api-version}` placeholder, then dedupes identical examples across versions into `since`
  lineages — one base entry plus a `since` variant whenever the content changes.

Options: `--out <dir>` (default `.`), `--namespace <ns>`, `--service <path>`,
`--split-by-interface`, `--dry-run`, `--warn-as-error`.

### Known limitation: examples removed in a later version

The format has a `since` ("applies from") marker but no `until`/removal marker, so an example that
existed in an earlier version but was **dropped** in a later one is still re-materialized for the
later versions (its base entry applies from its first appearance onward). Migration flags each such
lineage with an `example-removed-before-latest` **warning** so the author can confirm it still
applies to later versions, or delete it. Services that rely on removing examples across versions are
not yet fully supported.

## `tsp-examples-legacy-expand`

> **Transitional tool.** Expands the unified format back into the classic per-version examples so
> downstream consumers keep working during rollout; it will be removed once consumers read
> `examples.yaml` directly.

Expand the unified examples into the concrete example for each operation at a target API version:

```bash
tsp-examples-legacy-expand <service-dir> --api-version <version>
```

It reads the linear version order from the adjacent `service.yaml`, discovers `examples.yaml` /
`examples/*.yaml`, and for each operation lineage selects the entry with the greatest `since` that
is `<=` the target (the base entry applies from the earliest version). The `{api-version}`
placeholder is substituted with the target version, and each resolved example is reconstructed into a
classic `x-ms-examples` document — the `title`/`operationId` envelope and the flat `parameters` bag
(with `api-version` re-added and the body under its Swagger parameter name), read from the service's
Swagger. Files are named by their preserved `legacyFilename` (or the conventional
`<OperationId>.json`). With `--out <dir>` each document is written as a separate JSON file; otherwise
a `filename → document` map is printed. Operations with no matching Swagger operation are reported
and skipped.

Options: `--api-version <v>` (required), `--out <dir>`.

## API

```ts
import {
  validateExamplesDir,
  validateExampleFiles,
  loadExampleFile,
  migrate,
  resolveExamplesDir,
} from "@azure-tools/typespec-azure-examples";

const { diagnostics } = await validateExamplesDir("path/to/service");

const { files } = await migrate("path/to/specs", { namespace: "Microsoft.EventGrid" });

const { examples } = await resolveExamplesDir("path/to/service", "2024-06-01");
```
