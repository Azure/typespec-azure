---
title: "no-openapi-client-extensions"
---

Azure specs should not use the `@typespec/openapi` `@extension` decorator to emit client-altering `x-ms-*` (and `x-nullable`) OpenAPI extensions.

These extensions change how clients, SDKs, and the ARM platform interpret an API — for example whether an operation is long-running, pageable, a secret, or an ARM resource. When they are hand-written with the raw `@extension` decorator they only appear in the OpenAPI (Swagger) output. Every other emitter (client SDK, service, ARM, etc.) works from the semantic TypeSpec model and never sees the extension, so it produces an incorrect representation of the API. Worse, the value is not validated or kept in sync with the rest of the spec.

Each of these extensions has a first-class TypeSpec construct that carries the same intent through the semantic model, so all emitters — including the OpenAPI emitter — produce a consistent and validated result. Use the construct instead of the raw extension.

This rule flags the following extensions:

| Extension                             | Use instead                                                                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-ms-skip-url-encoding`              | `@path(#{ allowReserved: true })` from `@typespec/http`                                                                                                                                                                                       |
| `x-ms-enum`                           | An [extensible `union`](https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05) (a `union` with a `string` variant)                                                                                                         |
| `x-ms-parameter-grouping`             | Group the parameters into a model and spread it into the operation                                                                                                                                                                            |
| `x-ms-parameter-location`             | Determined automatically by the emitter; use `@clientLocation` from `@azure-tools/typespec-client-generator-core` when overriding client placement                                                                                            |
| `x-ms-client-name`                    | [`@clientName`](https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/reference/decorators/#@Azure.ClientGenerator.Core.clientName) from `@azure-tools/typespec-client-generator-core`                         |
| `x-ms-discriminator-value`            | [`@discriminator`](https://typespec.io/docs/standard-library/built-in-decorators/#@discriminator) with a named model hierarchy                                                                                                                |
| `x-ms-client-flatten`                 | [`@flattenProperty`](https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/reference/decorators/#@Azure.ClientGenerator.Core.Legacy.flattenProperty) from `@azure-tools/typespec-client-generator-core`        |
| `x-ms-parameterized-host`             | [`@server`](https://typespec.io/docs/libraries/http/reference/decorators/#@TypeSpec.Http.server) from `@typespec/http`                                                                                                                        |
| `x-ms-pageable`                       | [`@list`](https://azure.github.io/typespec-azure/docs/libraries/azure-core/reference/decorators/#@Azure.Core.list) / the `Azure.Core` paging operation templates                                                                              |
| `x-ms-long-running-operation`         | The `Azure.Core` / `Azure.ResourceManager` long-running operation templates (e.g. `LongRunningResourceCreateOrReplace`)                                                                                                                       |
| `x-ms-long-running-operation-options` | The long-running operation templates together with `@pollingOperation` / `@finalOperation`                                                                                                                                                    |
| `x-nullable`                          | Make the property optional (`?`), or model the value explicitly; Azure specs should not use nullable types                                                                                                                                    |
| `x-ms-internal`                       | [`@access(Access.internal)`](https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/reference/decorators/#@Azure.ClientGenerator.Core.access) from `@azure-tools/typespec-client-generator-core`                |
| `x-ms-azure-resource`                 | The `Azure.ResourceManager` resource templates (`TrackedResource`, `ProxyResource`, `ExtensionResource`, ...)                                                                                                                                 |
| `x-ms-arm-id-details`                 | [`armResourceIdentifier`](https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/reference/data-types/#Azure.ResourceManager.CommonTypes.ResourceIdentifier) scalar from `@azure-tools/typespec-azure-resource-manager` |
| `x-ms-secret`                         | [`@secret`](https://typespec.io/docs/standard-library/built-in-decorators/#@secret) from the TypeSpec standard library                                                                                                                        |

## Impact

- **Area:** API, SDK, Emitters

Hand-written client-altering extensions change the OpenAPI output without informing the semantic model, so client SDKs, service code, and ARM tooling misrepresent the API (missing long-running/pageable behavior, wrong client names, unflattened models, secrets that are not treated as secrets, resources that are not recognized as ARM resources, and so on). Using the equivalent TypeSpec construct keeps every emitter consistent and lets the OpenAPI emitter generate the extension for you.

## LintDiff Equivalent

Several LintDiff rules require or validate these same extensions in Swagger. Because those extensions are generated for you when you use the corresponding TypeSpec construct, expressing the behavior semantically (rather than hand-writing the extension) is what keeps the generated OpenAPI compliant with these rules:

- `x-ms-long-running-operation` — [LongRunningOperationsWithLongRunningExtension (R2007)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2007), [LongRunningResponseStatusCode (R2005)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2005), [LROStatusCodesReturnTypeSchema (R2064)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2064)
- `x-ms-long-running-operation-options` — [LongRunningOperationsOptionsValidator (R2010)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2010)
- `x-ms-pageable` — [PageableOperation (R2029)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2029), [PageableRequires200Response (R2060)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2060), [XmsPageableMustHaveCorrespondingResponse (R4012)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r4012)
- `x-ms-enum` — [XmsEnumValidation (R2018)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2018), [UniqueXmsEnumName (R4005)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r4005)
- `x-ms-parameter-location` — [XmsParameterLocation (R4001)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r4001)
- `x-ms-client-name` — [XmsClientNameParameter (R2012)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2012), [XmsClientNameProperty (R2013)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2013)
- `x-ms-client-flatten` — [AvoidNestedProperties (R2001)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2001)
- `x-ms-azure-resource` — [ResourceHasXMsResourceEnabled (R2019)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2019), [XmsResourceInPutResponse (R2062)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2062)
- `x-ms-secret` — [XMSSecretInResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-secret-in-response.md)

## Examples

### `x-ms-long-running-operation`

#### ❌ Incorrect

```tsp
@OpenAPI.extension("x-ms-long-running-operation", true)
op createWidget(...Widget): Widget;
```

#### ✅ Correct

```tsp
op createWidget is Azure.Core.ResourceOperations.LongRunningResourceCreateOrReplace<Widget>;
```

### `x-ms-enum`

#### ❌ Incorrect

```tsp
@OpenAPI.extension("x-ms-enum", #{ name: "PetKind", modelAsString: true })
enum PetKind {
  Cat,
  Dog,
}
```

#### ✅ Correct

```tsp
union PetKind {
  Cat: "Cat",
  Dog: "Dog",
  string,
}
```

### `x-ms-client-name`

#### ❌ Incorrect

```tsp
model Widget {
  @OpenAPI.extension("x-ms-client-name", "widgetName")
  name: string;
}
```

#### ✅ Correct

```tsp
model Widget {
  @clientName("widgetName")
  name: string;
}
```

### `x-ms-secret`

#### ❌ Incorrect

```tsp
model Credentials {
  @OpenAPI.extension("x-ms-secret", true)
  key: string;
}
```

#### ✅ Correct

```tsp
model Credentials {
  @secret
  key: string;
}
```

## Suppression

Do not suppress. Replace the raw extension with the equivalent TypeSpec construct listed above so every emitter — not just the OpenAPI emitter — reflects the intended behavior. If the extension is a genuinely emitter-only, non-client-altering annotation that has no TypeSpec construct, it does not belong in this list; open an issue rather than suppressing.
