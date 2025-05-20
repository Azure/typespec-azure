---
title: "Emitter usage"
---

## Usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-java
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-java"
```

The config can be extended with options as follows:

```yaml
emit:
  - "@azure-tools/typespec-java"
options:
  "@azure-tools/typespec-java":
    option: value
```

## Emitter options

### `emitter-output-dir`

**Type:** `absolutePath`

Defines the emitter output directory. Defaults to `{output-dir}/@azure-tools/typespec-java`
See [Configuring output directory for more info](https://typespec.io/docs/handbook/configuration/configuration/#configuring-output-directory)

### `namespace`

**Type:** `string`

Specifies the namespace you want to override for namespaces set in the spec. With this config, all namespace for the spec types will default to it.

### `service-name`

**Type:** `string`

Specify the human readable name of the service. The name will be used in `README.md` and entry class. This option is for management-plane SDK.

### `examples-dir`

**Type:** `string`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

### `generate-samples`

**Type:** `boolean`

When set to `true`, the emitter will generate Java sample code. Default value is `true`.

### `generate-tests`

**Type:** `boolean`

When set to `true`, the emitter will generate Java test code (mock test for management-plane SDK, disabled live test for data-plane SDK). Default value is `true`.

### `enable-sync-stack`

**Type:** `boolean`

When set to `true`, the generated SDK uses synchronous REST API invocation. Default value is `true`. This option is to be deprecated.

### `stream-style-serialization`

**Type:** `boolean`

When set to `true`, the generated SDK uses stream style serialization. Default value is `true`. This option is to be deprecated.

### `use-object-for-unknown`

**Type:** `boolean`

When set to `true`, the emitter generates Java `Object` for TypeSpec `unknown`; otherwise, the emitter generates `BinaryData`. Default value is `false`. This option is for backward-compatibility.

### `generate-protocol-methods`

**Type:** `boolean`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.

### `generate-convenience-methods`

**Type:** `boolean`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.

### `partial-update`

**Type:** `boolean`

When set to `true`, the emitter will merge the generated code with existing code on `emitter-output-dir`, during post-process. Default value is `false`.

### `models-subpackage`

**Type:** `string`

Specify the package name for model classes. Default value is `models`.

### `custom-types`

**Type:** `string`

Specify the Java class names for custom model classes.

### `custom-types-subpackage`

**Type:** `string`

Specify the package name for custom model classes.

### `customization-class`

**Type:** `string`

Specify the Java class that to be executed by emitter for [code customization](https://github.com/Azure/autorest.java/blob/main/customization-base/README.md), during post-process.

### `skip-special-headers`

**Type:** `array`

Specify headers that emitter will ignore.

### `enable-subclient`

**Type:** `boolean`

When set to `true`, the generated SDK uses `getter` method to access child clients. Default value is `false`.

### `api-version`

**Type:** `string`

Use this flag if you would like to generate the sdk only for a specific version. Default value is the latest version. Also accepts values `latest` and `all`.

### `advanced-versioning`

**Type:** `boolean`

When set to `true`, the emitter will take the history of api-versions in TypeSpec, and try generate SDK without breaking changes compared to SDK generated from prior api-versions. Default value is `false`. This is an experimental feature.

### `service-version-exclude-preview`

**Type:** `boolean`

When set to `true`, the emitter will not include `##-preview` api-versions in ServiceVersion class. Default value is `false`. The option should be set to `true`, if the intended release is SDK of stable version.

### `dev-options`

**Type:** `object`

Developer options for http-client-java emitter.
