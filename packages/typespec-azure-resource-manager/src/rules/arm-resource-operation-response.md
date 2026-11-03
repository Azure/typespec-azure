Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

For collection GET operations, the `value` array's item model must match the actual HTTP 200 response model of the corresponding individual GET. This comparison also applies to hand-authored ARM routes and custom response envelopes; it does not depend on the item model being registered as an ARM resource.

GET operations are paired by their resource paths after the last `/providers/` segment, ignoring path parameter names and a trailing slash. This allows subscription- and resource-group-scoped collections to be checked against the individual resource GET. A collection without a corresponding individual GET does not introduce an additional item-schema check.

The existing lifecycle response checks remain in place. The [`list-response-envelope`](https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope) rule owns missing or non-array `value` properties.

:::note
ARM RPC rule: [`RPC-008`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** API

The resource operation returns a response schema that violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the Swagger linter rules [PutGetPatchResponseSchema](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3007) and [GetCollectionResponseSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-collection-response-schema.md). The collection comparison uses TypeSpec HTTP metadata rather than emitted schema references. It retains this rule's warning severity and enablement; the Swagger linter reports an ARM error.

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
