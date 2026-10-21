# @azure-tools/typespec-azure-examples

Tooling for the Azure **unified examples format** (`examples.yaml`): the published JSON Schema
and the `tsp-examples` CLI, plus the transitional `tsp-examples-migrate` and
`tsp-examples-legacy-expand` tools.

The unified examples format replaces the ~282K per-version `x-ms-examples` JSON files with a
single version-aware `examples.yaml` per service (or `examples/<Interface>.yaml` for large
services). See the RFC: _Unified Examples Format_.

## Format

```yaml
# yaml-language-server: $schema=https://unpkg.com/@azure-tools/typespec-azure-examples@0.2.1/dist/schema/dist/ExamplesYaml.json
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
- Optional `id` is the filename stem: `id: GetWidget` generates `GetWidget.json`.
  Existing `legacyFilename: GetWidget.json` remains supported. Lineages still use titles.

## Authoring workflow

In `azure-rest-api-specs`, run `pnpm install` from the repository root. The root install
exposes `pnpm tsp-examples`; other repositories can install
`@azure-tools/typespec-azure-examples` as a development dependency.

Check `pnpm tsp-examples --help` before using a command from this document. Published
version 0.2.1 includes `validate`, but not `add`. The separate migration and expansion
binaries are available as `pnpm tsp-examples-migrate` and
`pnpm tsp-examples-legacy-expand`.

### Adding or editing an example

1. Author `examples.yaml` beside `main.tsp` and `service.yaml`, or keep related operations
   together in `examples/<Interface>.yaml`. An operation and all its version variants must
   stay in one file. Existing specs-repository checks require an `examples/` directory,
   so the per-interface layout avoids adding directory placeholders.
2. Use the canonical operation key, not a language SDK method name:
   `CaCertificates_Get` in Swagger maps to `CaCertificates.get`; a standalone ID such as
   `GetSchemaById` keeps its spelling. `$namespace` is the TypeSpec service namespace.
3. Put values in their HTTP locations: `request.path`, `query`, `headers`, or `body`.
   The body is its wire payload, without the legacy Swagger body-parameter wrapper.
   Responses use numeric status keys, with optional `headers` and `body`.
4. Use `id` without `.json` when the generated filename needs to be preserved. `title`
   is optional display text, but it also groups version variants into lineages: keep
   it unchanged within a lineage. Different examples on one operation need distinct titles.
5. Omit the request `api-version`. Use `{api-version}` only where a value should contain
   the selected version; keep an intentionally different historical version literal.

From the repository root, validate and regenerate:

```bash
pnpm tsp-examples validate path/to/project --warn-as-error
pnpm exec tsp compile path/to/project
```

Edit YAML, not the emitted `stable/<version>/examples/*.json` or
`preview/<version>/examples/*.json`. Commit the regenerated artifacts with the YAML.
Preserve existing sample values and titles when changing only the authoring format.

### Adding an API version

First add the version to the TypeSpec definition and compile it so the versioned Swagger
and adjacent `service.yaml` are current. An unchanged example needs no new entry: its base
or latest applicable `since` variant carries forward.

For changed example data, append a **complete** request/response variant with the same
title and a quoted `since` from `service.yaml`. This is a replacement value for that
version onward, not a partial patch. Do not modify an older variant if its historical
output must stay unchanged. A newly introduced example also needs `since` when it must
not appear in earlier versions.

When the installed CLI lists `add`, the command below can prepare new/changed entries;
review its cloned values and fill in generated skeletons before committing:

```bash
pnpm tsp-examples add path/to/project --api-version 2025-01-01 --dry-run
pnpm tsp-examples add path/to/project --api-version 2025-01-01
```

If `add` is unavailable, author those variants manually. Version selection follows
`service.yaml` order, including version strings that are not full dates. Do not use
this workflow to remove an example in a later version; see the removal limitation below.

### Migrating an existing service

Keep the original JSON examples until migration and compilation have been compared:

```bash
pnpm tsp-examples-migrate path/to/swagger-root --out path/to/project --service path/to/project/service.yaml --split-by-interface --dry-run --warn-as-error
```

`swagger-root` must contain the `stable/` and `preview/` trees; it can differ from the
TypeSpec project directory. Review the preview, then run without `--dry-run`.
Compile the project and compare every migrated version's example filenames, titles,
parameter values, response values, and Swagger references. Only then remove the authored
JSON under the project's old `examples/<version>/` directories. Retain generated JSON
referenced by Swagger and leave historical Swagger-only versions outside the migration unchanged.

### Editor support and validation guarantees

The JSON Schema is already published inside the package. The version-pinned URL used in
the modeline above provides completion and structural checks in YAML language-server
editors for either file layout. The same URL can be associated with `**/examples.yaml`
and `**/examples/*.yaml` in editor settings. Pin a schema version supported by the installed
tooling; no repository-specific schema server is required.

Editor schema checks do not establish that an operation exists or that example values
match the API. In published examples 0.2.1, `validate` also checks only the document's
format and version/placement rules. Continue to run TypeSpec compilation and normal
API/SDK CI checks.

If `pnpm tsp-examples validate --help` lists `--schema-only`, that release supports
API-aware validation: the normal command compiles `main.tsp` in memory using the project's
installed compiler/AutoRest emitter and checks values against the current API contract.
`--schema-only` explicitly selects the format-only check. Do not assume those capabilities
from an updated README alone; check the installed command's help.

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
tsp-examples add SERVICE_DIR [--api-version VERSION]
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
Swagger. Files are named `<id>.json`, by the compatibility `legacyFilename`, or by the conventional
`<OperationId>.json`. With `--out <dir>` each document is written as a separate JSON file; otherwise
a `filename → document` map is printed. Operations with no matching Swagger operation are reported
and skipped.

Options: `--api-version <v>` (required), `--out <dir>`.

## API

The package's default entrypoint is browser-compatible. It provides the JSON Schema and in-memory
parsing, validation, resolution, and materialization helpers without Node.js globals or polyfills:

```ts
import {
  loadExampleFile,
  validateExampleFiles,
  resolveExampleFiles,
} from "@azure-tools/typespec-azure-examples";

const file = loadExampleFile("examples.yaml", yamlContent);
const diagnostics = validateExampleFiles([file]);
const { examples } = resolveExampleFiles([file], "2024-06-01", ["2024-06-01"]);
```

Filesystem discovery, migration, example authoring, and terminal diagnostic formatting require Node.js. They are
available from the explicit `/node` entrypoint; Node.js also automatically selects this entrypoint
for imports from the package root, preserving existing Node.js usage. The CLI commands are unchanged.

```ts
import {
  add,
  validateExamplesDir,
  migrate,
  resolveExamplesDir,
} from "@azure-tools/typespec-azure-examples/node";

const { diagnostics } = await validateExamplesDir("path/to/service");

const { files } = await migrate("path/to/specs", { namespace: "Microsoft.EventGrid" });

const { examples } = await resolveExamplesDir("path/to/service", "2024-06-01");

const result = await add("path/to/service");
```
