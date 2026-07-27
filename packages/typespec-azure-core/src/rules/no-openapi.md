Azure services should not be using decorators from the OpenAPIs libraries(`@azure-tools/openapi`, `@azure-tools/typespec-autorest` or `@azure-tools/openapi3`) in their spec.
Using those decorators is usually a sign that the spec is either not following the correct Azure or trying to match exactly a particular OpenAPI spec which should be a non-goal.

Those decorators are only meant to be read by the openapi emitters which means this might achieve the correct OpenAPI output but other emitters(client SDK, service, etc.) will not be able to understand them and will see a broken representation of the spec.

## Impact

- **Area:** API, SDK, Emitters

Raw OpenAPI (`@openapi` and extensions) changes the OpenAPI output without informing other emitters such as SDKs, so SDKs can misrepresent the wire API.

## Decorators and their alternatives

| OpenAPI Decorator                    | Alternative                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@example`                           | [See examples doc](../../../migrate-swagger/faq/x-ms-examples.mdx)                                                                                              |
| `@extension("x-ms-examples", `       | [See examples doc](../../../migrate-swagger/faq/x-ms-examples.mdx)                                                                                              |
| `@extension("x-ms-client-flatten", ` | Use [`@flattenProperty`](../../typespec-client-generator-core/reference/decorators.md#@Azure.ClientGenerator.Core.Legacy.flattenProperty)                       |
| `@extension("x-ms-mutability", `     | Use [`@visibility` decorator](https://typespec.io/docs/standard-library/built-in-decorators#@visibility)                                                        |
| `@extension("x-ms-enum", `           | [Enum extensibility doc](../../../troubleshoot/enum-not-extensible.md)                                                                                          |
| `@extension("x-ms-identifiers", `    | Use [`@identifiers`](../../azure-resource-manager/reference/decorators.md#@Azure.ResourceManager.identifiers)                                                   |
| `@operationId`                       | Name your interface and operation accordingly                                                                                                                   |
| `@useRef`                            | This should not be used, define the types correctly in TypeSpec. For ARM common types read the [Arm docs](../../../getstarted/azure-resource-manager/step00.md) |
| `@info`                              | Use versioning library for `version` and `@service` for title                                                                                                   |

## Examples

### `@extension("x-ms-enum"`

#### ❌ Incorrect

```tsp
@extension(
  "x-ms-enum",
  {
    name: "PetKind",
    modelAsString: true,
  }
)
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

### `@extension("x-ms-mutability"`

#### ❌ Incorrect

```tsp
model Pet {
  @extension("x-ms-mutability", #["read", "create"])
  name: string;
}
```

### `@extension("x-ms-identifiers"`

#### ❌ Incorrect

```tsp
model Pet {
  @extension("x-ms-identifiers", #["customId"])
  names: Name[];
}
model Name {
  customId: string;
}
```

#### ✅ Correct

```tsp
model Pet {
  @identifiers(#["customId"])
  names: Name[];
}
model Name {
  customId: string;
}
```

### `@operationId`

#### ❌ Incorrect

```tsp
@operationId("Pet_Get")
op getPet(): Pet;
```

#### ✅ Correct

```tsp
interface Pet {
  get(): Pet;
}
```

## Suppression

Suppression is acceptable when the extension does not affect the API or SDK - for example `@externalDocs`, or extensions like `x-ms-identifiers`. Extensions that do affect behavior should never be suppressed: use `@list` instead of `x-ms-pageable`, the Async operation templates instead of `x-ms-long-running-operation*`, `@secret` or a password type instead of `x-ms-secret`, and `@clientLocation` or `@clientName` instead of `@operationId`.
