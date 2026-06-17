---
title: "Emitter usage"
---

## Emitter usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-client-generator-core
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-client-generator-core"
```

The config can be extended with options as follows:

```yaml
emit:
  - "@azure-tools/typespec-client-generator-core"
options:
  "@azure-tools/typespec-client-generator-core":
    option: value
```

## Emitter options

### `emitter-output-dir`

**Type:** `absolutePath`

Defines the emitter output directory. Defaults to `{output-dir}/@azure-tools/typespec-client-generator-core`
See [Configuring output directory for more info](https://typespec.io/docs/handbook/configuration/configuration/#configuring-output-directory)

### `emitter-name`

**Type:** `string`

Set `emitter-name` to output TCGC code models for specific language's emitter.

### `generate-protocol-methods`

**Type:** `boolean`

When set to `true`, the emitter will generate low-level protocol methods for each service operation if `@protocolAPI` is not set for an operation. Default value is `true`.

### `generate-convenience-methods`

**Type:** `boolean`

When set to `true`, the emitter will generate convenience methods for each service operation if `@convenientAPI` is not set for an operation. Default value is `true`.

### `api-version`

**Type:** `string`

Use this flag if you would like to generate the sdk only for a specific version. Default value is the latest version. Also accepts values `latest` and `all`. For multi-service packages, provide a map from each service namespace's full name to its desired version; services not listed default to their latest version.

### `license`

**Type:** `object { name, company, link, header, description }`

License information for the generated client code.

**Properties:**

| Name          | Type     | Default | Description                                                                                                                                                                                                                      |
| ------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | `string` |         | License name. The config is required. Predefined license are: MIT License, Apache License 2.0, BSD 3-Clause License, MPL 2.0, GPL-3.0, LGPL-3.0. For other license, you need to configure all the other license config manually. |
| `company`     | `string` |         | License company name. It will be used in copyright sentences.                                                                                                                                                                    |
| `link`        | `string` |         | License link.                                                                                                                                                                                                                    |
| `header`      | `string` |         | License header. It will be used in the header comment of generated client code.                                                                                                                                                  |
| `description` | `string` |         | License description. The full license text.                                                                                                                                                                                      |

### `examples-dir`

**Type:** `string`

Specifies the directory where the emitter will look for example files. If the flag isn’t set, the emitter defaults to using an `examples` directory located at the project root.

### `namespace`

**Type:** `string`

Specifies the namespace you want to override for namespaces set in the spec. With this config, all namespace for the spec types will default to it.
