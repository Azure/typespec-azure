Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

For registered ARM list operations, the `value` array in a 200 response must contain the
registered resource model, not a separate summary model or scalar type. This includes
custom response envelopes, response-body unions, and inherited `value` properties. Anonymous spreads of the
same resource model are accepted.

Use the standard ARM list templates without overriding `Response` unless a custom envelope
is needed. When customizing the envelope, keep the same resource type as its array items.
Envelope property names and array shape are validated separately by `list-response-envelope`.

:::note
ARM RPC rule: [`RPC-008`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** API

The resource operation returns a response schema that violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PutGetPatchResponseSchema](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3007) (the TypeSpec rule also covers `list`).

It also covers the item-schema consistency requirement of
[`GetCollectionResponseSchema`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-collection-response-schema.md)
for registered ARM list operations with a `value` array in a 200 response. Unlike the
Swagger validator's path-based discovery, this rule uses ARM resource-operation registration.
Missing or non-array `value` properties belong to `list-response-envelope`; full legacy
discovery parity is not implied. This rule retains warning severity, whereas the Swagger
rule reports an error.

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
