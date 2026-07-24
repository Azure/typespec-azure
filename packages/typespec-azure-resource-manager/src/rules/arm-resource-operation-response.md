PUT, GET, PATCH & LIST must return the same resource schema. Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

:::note
ARM RPC rule: [`RPC-008`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** API

The resource operation returns a response schema that violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PutGetPatchResponseSchema](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3007) (the TypeSpec rule also covers `list`).

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
