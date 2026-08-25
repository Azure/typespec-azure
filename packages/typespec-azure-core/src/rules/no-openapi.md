Azure services should not be using decorators from the OpenAPIs libraries(`@azure-tools/openapi`, `@azure-tools/typespec-autorest` or `@azure-tools/openapi3`) in their spec.
Using those decorators is usually a sign that the spec is either not following the correct Azure or trying to match exactly a particular OpenAPI spec which should be a non-goal.

Those decorators are only meant to be read by the openapi emitters which means this might achieve the correct OpenAPI output but other emitters(client SDK, service, etc.) will not be able to understand them and will see a broken representation of the spec.

## Impact

- **Area:** API, SDK, Emitters

Raw OpenAPI decorators (such as `@operationId`, `@useRef`, and `@info`) change the OpenAPI output without informing other emitters such as SDKs, so SDKs can misrepresent the wire API.

:::note
This rule does not flag the `@extension` decorator. Client-altering `x-ms-*` extensions emitted through `@extension` are handled by the [`no-openapi-client-extensions`](./no-openapi-client-extensions.md) rule.
:::

## Decorators and their alternatives

| OpenAPI Decorator | Alternative                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@example`        | [See examples doc](../../../migrate-swagger/faq/x-ms-examples.mdx)                                                                                              |
| `@operationId`    | Name your interface and operation accordingly                                                                                                                   |
| `@useRef`         | This should not be used, define the types correctly in TypeSpec. For ARM common types read the [Arm docs](../../../getstarted/azure-resource-manager/step00.md) |
| `@info`           | Use versioning library for `version` and `@service` for title                                                                                                   |

## Examples

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

Suppression is acceptable when the decorator does not affect the API or SDK - for example `@externalDocs`. Decorators that do affect behavior should never be suppressed: name your interface and operation accordingly instead of using `@operationId`, and define the types correctly in TypeSpec instead of using `@useRef`.
