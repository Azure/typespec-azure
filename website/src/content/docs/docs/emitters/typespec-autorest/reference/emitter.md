---
title: "Emitter usage"
---

## Emitter usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-autorest
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-autorest"
```

The config can be extended with options as follows:

```yaml
emit:
  - "@azure-tools/typespec-autorest"
options:
  "@azure-tools/typespec-autorest":
    option: value
```

## Emitter options

### `emitter-output-dir`

**Type:** `absolutePath`

Defines the emitter output directory. Defaults to `{output-dir}/@azure-tools/typespec-autorest`
See [Configuring output directory for more info](https://typespec.io/docs/handbook/configuration/configuration/#configuring-output-directory)

### `output-dir`

:::caution
**Deprecated**: This option is deprecated.
:::

**Type:** `string`

Deprecated DO NOT USE. Use built-in emitter-output-dir instead

### `output-file`

**Type:** `string`

Name of the output file.
Output file will interpolate the following values:

- service-name: Name of the service if multiple
- version: Version of the service if multiple
- version-status: `preview` if version contains preview, stable otherwise.

Default: `{emitter-output-dir}/{service-name}/{version-status}/{version}/openapi.json`

Example: Single service no versioning

- `openapi.yaml`

Example: Multiple services no versioning

- `openapi.Org1.Service1.yaml`
- `openapi.Org1.Service2.yaml`

Example: Single service with versioning

- `openapi.v1.yaml`
- `openapi.v2.yaml`

Example: Multiple service with versioning

- `openapi.Org1.Service1.v1.yaml`
- `openapi.Org1.Service1.v2.yaml`
- `openapi.Org1.Service2.v1.0.yaml`
- `openapi.Org1.Service2.v1.1.yaml`

Example: Versioning with version-status

- `arm-folder/AzureService/stable/2020-01-01.yaml`
- `arm-folder/AzureService/preview/2020-01-01.yaml`

### `examples-dir`

**Type:** `string`

Directory where the examples are located. Default: `{project-root}/examples`.

### `examples-directory`

:::caution
**Deprecated**: This option is deprecated.
:::

**Type:** `string`

DEPRECATED. Use examples-dir instead

### `version`

**Type:** `string`

### `azure-resource-provider-folder`

**Type:** `string`

Deprecated. Do not use this option. Specify the path directly in emitter-output-dir.

### `arm-types-dir`

**Type:** `string`

Path to the common-types.json file folder. Default: '${project-root}/../../common-types/resource-management'

### `new-line`

**Type:** `"crlf" | "lf"`

**Default:** `"lf"`

Set the newline character for emitting files.

### `omit-unreachable-types`

**Type:** `boolean`

Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted.

### `version-enum-strategy`

**Type:** `string`

**Default:** `"omit"`

Decide how to deal with the Version enum when when `omit-unreachable-types` is not set. Default to 'omit'

### `include-x-typespec-name`

**Type:** `"inline-only" | "never"`

**Default:** `"never"`

If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it.
This extension is meant for debugging and should not be depended on.

### `use-read-only-status-schema`

**Type:** `boolean`

**Default:** `false`

Create read-only property schema for lro status

### `emit-lro-options`

**Type:** `"none" | "final-state-only" | "all"`

**Default:** `"final-state-only"`

Determine whether and how to emit x-ms-long-running-operation-options for lro resolution

### `emit-common-types-schema`

**Type:** `"never" | "for-visibility-changes"`

**Default:** `"for-visibility-changes"`

Determine whether and how to emit schemas for common-types rather than referencing them

### `xml-strategy`

**Type:** `"xml-service" | "none"`

**Default:** `"xml-service"`

Strategy for applying XML serialization metadata to schemas.

### `output-splitting`

**Type:** `"legacy-feature-files"`

Determines whether output should be split into multiple files. The only supported option for splitting is "legacy-feature-files", which uses the typespec-azure-resource-manager `@feature` decorators to split into output files based on feature.

### `skip-example-copying`

**Type:** `boolean`

**Default:** `false`

When enabled, the emitter will not copy example files to the output directory. Instead, it will reference the source example files using relative file paths.

### `type-name-strategy`

**Type:** `"namespaced" | "name-only"`

**Default:** `"namespaced"`

Strategy for naming the OpenAPI names derived from TypeSpec types. "namespaced" (default) includes the namespace prefix for types outside the service namespace (e.g. `LiftrBase.Foo`). "name-only" uses only the type name without any namespace prefix (e.g. `Foo`), reporting an error when two types collapse to the same name.

### `service-yaml`

**Type:** `"auto" | "always" | "never"`

**Default:** `"auto"`

Controls emission of a `service.yaml` manifest at the project root. "auto" (default) emits it only if the file already exists, "always" always emits it, "never" disables it. When an existing file is present it is updated in place, preserving comments and unrelated keys.
