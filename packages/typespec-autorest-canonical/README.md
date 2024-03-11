# @azure-tools/typespec-autorest-canonical

TypeSpec library for emitting canonical version swagger

## Install

```bash
npm install @azure-tools/typespec-autorest-canonical
```

## Emitter

### Usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-autorest-canonical
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-autorest-canonical"
```

### Emitter options

#### `output-file`

**Type:** `string`

Name of the output file.
Output file will interpolate the following values:

- service-name: Name of the service if multiple
- version: Version of the service if multiple
- azure-resource-provider-folder: Value of the azure-resource-provider-folder option
- version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise.

Default: `{azure-resource-provider-folder}/{service-name}/{version-status}/canonical/openapi.json`

Example: Single service no versioning

- `canonical.openapi.json`

Example: Multiple services no versioning

- `Service1.canonical.openapi.json`
- `Service2.canonical.openapi.json`

Example: Single service with versioning

- `canonical.openapi.json`

Example: Multiple service with versioning

- `Service1.canonical.openapi.json`
- `Service2.canonical.openapi.json`

#### `version`

**Type:** `string`

#### `azure-resource-provider-folder`

**Type:** `string`

#### `arm-types-dir`

**Type:** `string`

Path to the common-types.json file folder. Default: '${project-root}/../../common-types/resource-management'

#### `new-line`

**Type:** `"crlf" | "lf"`

Set the newline character for emitting files.

#### `omit-unreachable-types`

**Type:** `boolean`

Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted.

#### `include-x-typespec-name`

**Type:** `"inline-only" | "never"`

If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it.
This extension is meant for debugging and should not be depended on.

#### `use-read-only-status-schema`

**Type:** `boolean`

Create read-only property schema for lro status
