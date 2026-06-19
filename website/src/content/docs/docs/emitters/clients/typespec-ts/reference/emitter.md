---
title: "Emitter usage"
---

## Emitter usage

1. Via the command line

```bash
tsp compile . --emit=@azure-tools/typespec-ts
```

2. Via the config

```yaml
emit:
  - "@azure-tools/typespec-ts"
```

The config can be extended with options as follows:

```yaml
emit:
  - "@azure-tools/typespec-ts"
options:
  "@azure-tools/typespec-ts":
    option: value
```

## Emitter options

### `emitter-output-dir`

**Type:** `absolutePath`

Defines the emitter output directory. Defaults to `{output-dir}/@azure-tools/typespec-ts`
See [Configuring output directory for more info](https://typespec.io/docs/handbook/configuration/configuration/#configuring-output-directory)

### `include-headers-in-response`

**Type:** `boolean`

This option is used to indicate whether to include response headers in the generated response type. When set to true, the generated response type will include response headers as properties.

### `include-shortcuts`

**Type:** `boolean`

Deprecated option for RLC legacy generation.

### `multi-client`

**Type:** `boolean`

Deprecated option for RLC legacy generation.

### `batch`

**Type:** `string[]`

Deprecated option for RLC legacy generation.

### `package-details`

**Type:** `object { name, scopeName, nameWithoutScope, description, version, isVersionUserProvided }`

This is to indicate the package information such as package name, package description etc.

**Properties:**

| Name                    | Type      | Default | Description |
| ----------------------- | --------- | ------- | ----------- |
| `name`                  | `string`  |         |             |
| `scopeName`             | `string`  |         |             |
| `nameWithoutScope`      | `string`  |         |             |
| `description`           | `string`  |         |             |
| `version`               | `string`  |         |             |
| `isVersionUserProvided` | `boolean` |         |             |

### `add-credentials`

**Type:** `boolean`

We support two types of authentication: Azure Key Credential(AzureKey) and Token credential(AADToken), any other will need to be handled manually.

There are two ways to set up our credential details

- To use `@useAuth` decorator in TypeSpec
- To config in yaml file

Please notice defining in TypeSpec is recommended and also has higher priority than second one.

To enable credential in `tspconfig.yaml` and we need to provide more details to let codegen know types.

### `credential-scopes`

**Type:** `string[]`

If we enable the option `add-credentials` and specify `credential-scopes` the details we would enable the AADToken authentication.

### `credential-key-header-name`

**Type:** `string`

If we enable the option `add-credentials` and specify `credential-key-header-name` the details we would enable the AzureKey authentication.

### `custom-http-auth-header-name`

**Type:** `string`

This option is used for special Key Auth, when the key has a shared prefix and this header is to set the header name

### `custom-http-auth-shared-key-prefix`

**Type:** `string`

This option is used for special Key Auth, when the key has a shared prefix and this header is to pass the rest of the header key.

### `generate-metadata`

**Type:** `boolean`

Whether to generate metadata files which includes package.json, README.md and tsconfig.json etc. Defaults to `undefined`. If there's not a package.json under package-dir, defaults to `true`. but if you'd like to disable this feature you could set it as `false`.

### `generate-test`

**Type:** `boolean`

Whether to generate test files, for basic testing of your generated sdks. Defaults to `undefined`.
other cases:

- If azure-sdk-for-js is `false`. Defaults to `false`.
- If azure-sdk-for-js is `true` but there's a test folder under package-dir. Defaults to `false`.
- If azure-sdk-for-js is `true` but there's not a test folder under package-dir. Defaults to `true`.

### `generate-sample`

**Type:** `boolean`

Whether to generate sample files, for basic samples of your generated sdks. Defaults to `undefined`. Management packages' default to `true`.

### `azure-sdk-for-js`

**Type:** `boolean`

This is used to indicate your project is generated in [azure-sdk-for-js](https://github.com/Azure/azure-sdk-for-js) repo or not. If your package is located in that repo we'll leverage `dev-tool` to accelerate our building and testing, however if not we'll remove the dependency for that tool. Defaults to `undefined`.

### `azure-output-directory`

**Type:** `string`

Deprecated option for RLC legacy generation

### `is-typespec-test`

**Type:** `boolean`

Internal option for test

### `title`

**Type:** `string`

Deprecated option for RLC legacy generation.

### `dependency-info`

**Type:** `object { link, description }`

Deprecated option for RLC legacy generation.

**Properties:**

| Name          | Type     | Default | Description |
| ------------- | -------- | ------- | ----------- |
| `link`        | `string` |         |             |
| `description` | `string` |         |             |

### `product-doc-link`

**Type:** `string`

Deprecated option for RLC legacy generation.

### `service-info`

**Type:** `object { title, description }`

Deprecated option for RLC legacy generation.

**Properties:**

| Name          | Type     | Default | Description |
| ------------- | -------- | ------- | ----------- |
| `title`       | `string` |         |             |
| `description` | `string` |         |             |

### `azure-arm`

**Type:** `boolean`

Whether the package is an arm package.

### `source-from`

**Type:** `string`

Internal option, the value is default for TypeSpec generation

### `is-modular-library`

**Type:** `boolean`

**Default:** `false`

Whether to generate a Modular library. Defaults to `false`. Arm packages default to `true`.

### `enable-operation-group`

**Type:** `boolean`

An option to treat interface as operation group. This is not recommended unless specifically told so

### `enable-model-namespace`

**Type:** `boolean`

Provides an option to add the model namespace to model names in case of conflicts across different namespaces. This approach is generally discouraged unless explicitly required.

### `hierarchy-client`

**Type:** `boolean`

An option to organize the client in a hierarchical way as defined by `@clientInitialization`. This is true by default.

### `module-kind`

**Type:** `"esm"`

**Default:** `"esm"`

Internal option for test.

### `compatibility-mode`

**Type:** `boolean`

Whether to affect the generation of the additional property feature for the Modular client. Defaults to `false`.

### `compatibility-lro`

**Type:** `boolean`

[deprecated] Whether to generate the legacy LRO interface. When `true`, we will generate legacy beginXXX and beginXXXAndWait LRO methods.

### `experimental-extensible-enums`

**Type:** `boolean`

Whether to transform union type enums to extensible enums

### `clear-output-folder`

**Type:** `boolean`

Determine whether to clear the entire output folder. By default, only the 'sources' folder is cleared, so metadata files at the project root remain untouched. This option can be useful in pipeline scenarios.

### `ignore-property-name-normalize`

**Type:** `boolean`

The emitter will use camel case to normalize the property name, to ignore this normalization, you can set this option to true

### `ignore-enum-member-name-normalize`

**Type:** `boolean`

The emitter has a normalization logic for enum member key, to ignore this normalization, you can set this option to true

### `compatibility-query-multi-format`

**Type:** `boolean`

Whether to generate the backward-compatible code for query parameter serialization for array types in RLC. Defaults to `false`

### `default-value-object`

**Type:** `boolean`

Deprecated option for RLC legacy generation.

### `typespec-title-map`

**Type:** `object`

Only for Modular generation
By default, code generation uses the titles specified in the `@client` and `@service` decorators in TypeSpec to name modular clients. If you need to override these names, you can configure the `typespec-title-map`. The map's keys represent the original client names from TypeSpec, and the values are the desired client names. This configuration supports renaming multiple clients.

```yaml
typespec-title-map:
  AnomalyDetectorClient: AnomalyDetectorRest
  AnomalyDetectorClient2: AnomalyDetectorRest2
```

### `should-use-pnpm-dep`

**Type:** `boolean`

Internal option for test.

### `ignore-nullable-on-optional`

**Type:** `boolean`

If an optional property is also marked as nullable, it will be treated as just optional. Defaults to `true` for Azure services.

### `wrap-non-model-return`

**Type:** `boolean`

When set to true (default for Azure services), non-model return types (arrays, scalars, enums, bytes with binary content type) will be wrapped in an XxxResponse type for HLC backward compatibility during TypeSpec migration.

### `enable-storage-compat`

**Type:** `boolean`

When enabled, every regular (non-LRO, non-paging) operation return type is augmented with a `_response` property containing `rawResponse` (PathUncheckedResponse), `parsedBody`, and `parsedHeaders`. Defaults to `false`.

### `treat-unknown-as-record`

**Type:** `boolean`

When set to true, TypeSpec `unknown` type will be translated to `Record<string, unknown>` instead of `any` in the generated Modular SDK. This is useful when migrating from HLC where `unknown` in swagger mapped to `Record<string, unknown>`. (Modular SDK only) Defaults to `false`.

### `generate-react-native-target`

**Type:** `boolean`

When set to true, generates React Native build targets (tsconfig, warp target, package.json exports). Only applicable when azure-sdk-for-js is true. Defaults to `false`.
