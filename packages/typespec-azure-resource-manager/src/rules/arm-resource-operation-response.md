Resource read, create, update, and list operations must return their associated resource model, or a collection of that model for list operations. A PUT request must also use the associated resource model.

ARM PUT 200 and 201 responses must describe a resource, including custom PUT operations. Resource identity comes from native ARM declarations: registered resources, common resource bases and their descendants, and explicitly declared custom resources. Matching resource property names alone does not make a model a resource.

Prefer standard resource and operation templates. For customized operations, use the appropriate ARM decorators so resource associations are available to tooling. A response that already fails the associated-resource comparison does not produce an additional resource-identity warning.

The request comparison respects request visibility and accepts aliases of the associated resource, but not separately declared input models. Multipart request bodies are outside this comparison. List responses compare their item type; discriminated base/derived resource responses are accepted.

Both 200 and 201 response bodies must be resource models when present. Bodyless responses, non-success responses, and response status requirements remain the responsibility of other rules.

:::note
ARM RPC rule: [`RPC-008`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** API

The resource operation returns a response schema that violates the RPC contract.

The examples assume `Widget` is a registered ARM resource in an ARM provider namespace.

## ❌ Incorrect

```tsp
model WidgetResult {
  value?: string;
}

@armResourceOperations
interface Widgets {
  create is ArmResourceCreateOrReplaceSync<
    Widget,
    Response = ArmResponse<WidgetResult> | ArmCreatedResponse<WidgetResult>
  >;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface Widgets {
  create is ArmResourceCreateOrReplaceSync<Widget>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard operation templates and do not override the response parameter.

For existing APIs with a distinct PUT request model, suppress `@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response` on the operation with a reason.

## LintDiff Equivalent

Partial native coverage of the following Swagger checks:

- [PutGetPatchResponseSchema](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3007)
- [PutRequestResponseSchemeArm](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-request-response-scheme-arm.md)
- [XmsResourceInPutResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-resource-in-put-response.md)
- [ConsistentResponseSchemaForPut](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-response-schema-for-put.md), together with Azure Core `response-schema-problem`.
