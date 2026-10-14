Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

PUT must also have a request body and reuse the same registered resource model for its request and exact 200/201 response bodies. Use `ArmResourceCreateOrReplaceSync<Resource>` rather than overriding its request model. Effective payload types are resolved using native request and read visibility. Bodyless variants (including `void`) are ignored; ambiguous content variants and unsupported object bodies are not arbitrarily selected.

Resource operation registration is checked by `use-operation-decorator`; this rule checks the body contract, including custom HTTP PUT operations. Sharing an unregistered body model is not sufficient to satisfy the resource response contract.

:::note
ARM RPC rule: [`RPC-008`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** API

The resource operation returns a response schema that violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PutGetPatchResponseSchema](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3007) (the TypeSpec rule also covers `list`).

It also covers [PutRequestResponseSchemeArm](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-request-response-scheme-arm.md), [ConsistentResponseSchemaForPut](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-response-schema-for-put.md), and [XmsResourceInPutResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-resource-in-put-response.md), in combination with `use-operation-decorator`.

## ❌ Incorrect

```tsp
@armResourceOperations
interface FooResources {
  // Returns BarResource instead of FooResource
  @get
  @armResourceRead(FooResource)
  get(...ResourceInstanceParameters<FooResource>): ArmResponse<BarResource> | ErrorResponse;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  @get
  @armResourceRead(FooResource)
  get(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard operation templates and do not override the response parameter.

For existing APIs with a distinct PUT request model, suppress `@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response` on the operation with a reason.
