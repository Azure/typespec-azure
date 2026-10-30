---
title: Author API examples in YAML
description: Write, validate, version, and migrate request/response examples for Swagger and SDKs.
---

Unified YAML examples are the authoring source for API requests and responses. AutoRest resolves
them for each API version and generates the JSON files referenced by `x-ms-examples`.

:::caution
Check every configured emitter before migrating. AutoRest support alone is not enough:
the published `@azure-tools/typespec-client-generator-core@0.73.0` does not read unified YAML. Keep legacy JSON sources until your
SDK toolchain supports YAML, and check the [standalone-operation lookup issue](https://github.com/Azure/typespec-azure/issues/5797)
if your service has standalone operations.
:::

## Set up the tools

Azure REST API Specs already includes `@azure-tools/typespec-azure-examples` at the repository root.
In another repository, add it to your workspace with `pnpm add -D @azure-tools/typespec-azure-examples`.
Run the following commands from that workspace:

```bash
SERVICE=path/to/service
pnpm tsp-examples --help
```

This guide's API validation commands require examples `0.2.2` or later, plus the project's installed
TypeSpec compiler and AutoRest emitter. Command availability is release-specific; check `--help`.

## Write examples

Place `examples.yaml` beside `main.tsp`, or use `examples/<Interface>.yaml`. Prefer the directory
layout in Azure REST API Specs, where validation requires an `examples/` directory:

```text
main.tsp
service.yaml
tspconfig.yaml
examples/
  Widgets.yaml
```

Use the TypeSpec API versions declared in [service.yaml](./rest-api-publish/service-yaml.md). AutoRest's default
`examples-format: auto` discovers the YAML. Remove any `examples-format: legacy` override, which ignores YAML.
For SDK emitters with YAML support, leave `examples-dir` unset: an explicit override selects legacy
JSON instead.

Adapt this example to your API's namespace, operation IDs, parameters, and response types:

```yaml title="examples/Widgets.yaml"
$namespace: Contoso.Widgets
Widgets.get:
  - title: Get a widget
    id: GetWidget
    request:
      path: { widgetName: widget-one }
      query: { includeDetails: true }
    responses:
      200:
        body: { name: widget-one, color: blue }

Widgets.update:
  - title: Update a widget
    id: UpdateWidget
    request:
      path: { widgetName: widget-one }
      headers: { If-Match: "*" }
      body: { color: green }
    responses:
      200:
        headers: { ETag: '"updated"' }
        body: { name: widget-one, color: green }
```

- **Operation keys** come from Swagger IDs: `Widgets_Get` becomes `Widgets.get`. A standalone ID
  such as `GetWidget` keeps its exact spelling. Do not substitute an SDK method name.
- **`id`** is a filename stem: `GetWidget` generates `GetWidget.json`, without storing `.json` in YAML.
- **`title`** identifies an example lineage. For multiple examples of one operation, use distinct titles
  and filenames; keep the title stable when adding a version of the same example.
- **Versions and values:** omit the request's `api-version`. Use `{api-version}` inside URLs such as
  `nextLink: https://example.test/widgets?api-version={api-version}`. Use actual booleans/numbers,
  not strings such as `"true"`, and only parameters and headers supported by your API.

Keep each operation's examples together, and do not split an interface across files.

## Validate and regenerate

```bash
pnpm tsp-examples validate "$SERVICE"
pnpm exec tsp compile "$SERVICE"
```

Validation checks YAML structure and request/response compatibility with the current API, including
operation keys, parameter names and locations, server parameters, bodies, statuses, and headers.
It compiles the API in memory without rewriting generated files; the second command regenerates them.

For format-only checks, use `pnpm tsp-examples validate "$SERVICE" --schema-only`.
This does **not** establish API compatibility. Migration preserves existing values, so validation
can expose mistakes that were already present in the old JSON.

## Add or update an API version

Unchanged examples carry forward automatically. Editing a base entry changes all versions that inherit
it. For a change starting at a later version, append a complete variant under the same operation,
retaining its title and filename:

```yaml title="Append under Widgets.get"
- title: Get a widget
  since: "2025-01-01"
  id: GetWidget
  request:
    path: { widgetName: widget-one }
    query: { includeDetails: true }
  responses:
    200:
      body: { name: widget-one, color: blue, size: medium }
```

Quote `since` and use a version listed in `service.yaml`. Version selection follows that file's order,
not string sorting. A variant replaces the whole example, not just the changed fields; leave the
earlier entry intact so older versions keep their original data.

If your installed CLI lists `add`, you can scaffold additions after regenerating Swagger:

```bash
pnpm exec tsp compile "$SERVICE"
pnpm tsp-examples add "$SERVICE" --api-version 2025-01-01 --dry-run
```

Remove `--dry-run` to write the result, then review and validate it. Existing examples are cloned
for changed operations; missing examples get skeletons to fill in. **`add` is on main but is not shipped in `0.2.2`**;
with that version, edit YAML directly as shown above.

:::caution
The format has no `until` or removal marker. Review migration warnings for examples intentionally
removed in a later version; that scenario is not fully supported.
:::

## Migrate existing JSON examples

After confirming emitter compatibility, preview conversion of the existing versioned Swagger examples:

```bash
pnpm tsp-examples-migrate "$SERVICE" --out "$SERVICE" --split-by-interface --dry-run --warn-as-error
```

Remove `--dry-run` to write YAML, then run the validation and compilation commands above.
Compare operation coverage, filenames, titles, and request/response values with the originals.
Fix reported data/API mismatches explicitly rather than bypassing validation.

Delete only the old **authored** JSON examples after those checks pass. Keep the **generated** JSON
referenced by Swagger. Do not copy the versioned `examples-dir`/`skip-example-copying` setup from the
[legacy JSON workflow](../migrate-swagger/faq/x-ms-examples.mdx) into a unified-YAML project.

## Editor completion

Add this modeline at the top of each YAML file:

```yaml
# yaml-language-server: $schema=https://unpkg.com/@azure-tools/typespec-azure-examples@0.2.2/dist/schema/dist/ExamplesYaml.json
```

The editor schema checks the file format; use the CLI's API-aware validation to check values against
your actual service.
