# @azure-tools/typespec-azure-examples

Tooling for the Azure **unified examples format** (`examples.yaml`): the published JSON Schema
and the `examples-validate` CLI.

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

## `examples-validate`

Validate a service's example files against the JSON Schema and the format rules:

```bash
examples-validate <service-dir>
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

## API

```ts
import {
  validateExamplesDir,
  validateExampleFiles,
  loadExampleFile,
} from "@azure-tools/typespec-azure-examples";

const { diagnostics } = await validateExamplesDir("path/to/service");
```
