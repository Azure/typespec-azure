# @azure-tools/typespec-java

## Prerequisites

- Install [Node.js](https://nodejs.org/en/download/) 22 or above. (Verify by running `node --version`)
- Install [Java](https://docs.microsoft.com/java/openjdk/download) 11 or above. (Verify by running `java --version`)
- Install [Maven](https://maven.apache.org/download.cgi). (Verify by running `mvn --version`)
- Install [TypeSpec](https://typespec.io/).

TypeSpec library for emitting Java client from the TypeSpec REST protocol binding

## Install

```bash
npm install @azure-tools/typespec-java
```

## Usage

### Initialize TypeSpec Project

Follow [TypeSpec Getting Started](https://typespec.io/docs/) to initialize your TypeSpec project.

Make sure `npx tsp compile .` runs correctly.

### Generate Java

Run `npx tsp compile client.tsp --emit=@azure-tools/typespec-java`
or `npx tsp compile client.tsp --emit=@azure-tools/typespec-java --options='@azure-tools/typespec-java.emitter-output-dir=<target-folder>'`.

If the `emitter-output-dir` option is not provided, the generated Java code will be under the `tsp-output/@azure-tools/typespec-java` folder.

A typical `tspconfig.yaml` looks like:

```yaml
emit:
  - "@azure-tools/typespec-java"
options:
  "@azure-tools/typespec-java":
    emitter-output-dir: "{project-root}/azure-ai-language-authoring"
    service-name: "Authoring"
    generate-samples: true
    generate-tests: true
    partial-update: false
    api-version: "2023-11-01"
```

## Emitter usage

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

Specify the human readable name of the service. The name will be used for classes like `<ServiceName>Manager` or `<ServiceName>ServiceVersion`

### `examples-dir`

**Type:** `string`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

### `generate-samples`

**Type:** `boolean`

**Default:** `true`

When set to `true`, the emitter will generate Java sample code. Default value is `true`.

### `generate-tests`

**Type:** `boolean`

**Default:** `true`

When set to `true`, the emitter will generate Java test code (mock test for management-plane SDK, disabled live test for data-plane SDK). Default value is `true`.

### `enable-sync-stack`

**Type:** `boolean`

**Default:** `true`

When set to `true`, the generated SDK uses synchronous REST API invocation. Default value is `true`. This option is to be deprecated.

### `stream-style-serialization`

**Type:** `boolean`

**Default:** `true`

When set to `true`, the generated SDK uses stream style serialization. Default value is `true`. This option is to be deprecated.

### `use-object-for-unknown`

**Type:** `boolean`

**Default:** `false`

When set to `true`, the emitter generates Java `Object` for TypeSpec `unknown`; otherwise, the emitter generates `BinaryData`. Default value is `false`. This option is for backward-compatibility.

### `client-side-validations`

**Type:** `boolean`

**Default:** `false`

When set to `true`, the model classes would be generated with a `validate()` API for validating required properties, during REST API invocation. Default value is `false`. This option is for backward-compatibility.

### `float32-as-double`

**Type:** `boolean`

**Default:** `true`

When set to `true`, the emitter generates Java `double` for TypeSpec `float32`; otherwise, the emitter generates `float`. Default value is `true`. This option is for backward-compatibility.

### `uuid-as-string`

**Type:** `boolean`

**Default:** `true`

When set to `true`, the emitter generates Java `String` for TypeSpec `Azure.Core.uuid`; otherwise, the emitter generates `UUID`. Default value is `true`. This option is for backward-compatibility.

### `generate-protocol-methods`

**Type:** `boolean`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.

### `generate-convenience-methods`

**Type:** `boolean`

When set to `true`, the emitter will generate convenience methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.

### `partial-update`

**Type:** `boolean`

**Default:** `false`

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

### `rename-model`

**Type:** `string,object`

Rename the model classes, in case they cannot be renamed via TCGC. E.g., anonymous models or templated models. Format should be in key-value form.

### `skip-special-headers`

**Type:** `string[]`

Specify headers that emitter will ignore.

### `enable-subclient`

**Type:** `boolean`

**Default:** `false`

When set to `true`, the generated SDK uses `getter` method to access child clients. Default value is `false`.

### `api-version`

**Type:** `string | object`

Use this flag if you would like to generate the sdk only for a specific version. Default value is the latest version. Also accepts values `latest` and `all`. For multi-service packages, provide a map from each service namespace's full name to its desired version; services not listed default to their latest version.

**Options:**

- `string`
- `object`

### `advanced-versioning`

**Type:** `boolean`

**Default:** `false`

When set to `true`, the emitter will take the history of api-versions in TypeSpec, and try generate SDK without breaking changes compared to SDK generated from prior api-versions. Default value is `false`. This is an experimental feature.

### `service-version-exclude-preview`

**Type:** `boolean`

**Default:** `false`

When set to `true`, the emitter will not include `##-preview` api-versions in ServiceVersion class, if the release targets a stable api-version. Default value is `true`. The option should be set to `true`, if the intended release is SDK of stable version.

### `dev-options`

**Type:** `object { generate-code-model, debug, loglevel, java-temp-dir, profile }`

Developer options for http-client-java emitter.

**Properties:**

| Name                  | Type                                              | Default | Description                                                       |
| --------------------- | ------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `generate-code-model` | `boolean`                                         |         | Generate intermittent 'code-model.yaml' file in output directory. |
| `debug`               | `boolean`                                         |         | Enable Java remote debug on port 5005.                            |
| `loglevel`            | `"off" \| "debug" \| "info" \| "warn" \| "error"` |         | Log level for Java logging. Default is 'warn'.                    |
| `java-temp-dir`       | `string`                                          |         | Temporary working directory for Java code generator.              |
| `profile`             | `boolean`                                         |         | Enable performance profiling.                                     |
