Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

Registered resource create-or-update operations using PUT must also have a request body whose effective payload type is the registered resource model. Use `ArmResourceCreateOrReplaceSync<Resource>` rather than overriding its request model. Request visibility is respected when resolving implicit bodies; aliases of the resource are accepted, but separately declared input models are not.

The PUT request check uses the existing registered-resource lifecycle traversal. It does not independently scan custom HTTP PUT operations or require arbitrary payload models to be registered. `use-operation-decorator` checks operation registration. Multipart request bodies are outside this request-model comparison. Existing lifecycle and list response validation is unchanged; this rule does not add HTTP status or content-variant selection.

:::note
ARM RPC rule: [`RPC-008`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** API

The resource operation returns a response schema that violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PutGetPatchResponseSchema](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3007) (the TypeSpec rule also covers `list`).

### Consolidated PUT coverage

The PUT request check addresses the resource-reuse intent of [PutRequestResponseSchemeArm](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-request-response-scheme-arm.md) through the registered resource model. Existing response validation and operation-registration rules provide complementary coverage for [ConsistentResponseSchemaForPut](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-response-schema-for-put.md) and [XmsResourceInPutResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-resource-in-put-response.md).

This is not equivalent to running those Swagger checks on every HTTP PUT. It does not compare arbitrary 200/201 schemas, validate the `x-ms-azure-resource` extension, or establish that every response body is registered.

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
