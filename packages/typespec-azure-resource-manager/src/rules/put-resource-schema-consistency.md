An ARM PUT operation must have a request body and reuse the same ARM resource
model for its request and `200`/`201` response bodies. Define the resource with
`TrackedResource`, `ProxyResource`, or another ARM resource template, and prefer
the standard create-or-replace operation templates.

Use lifecycle visibility for request/response property differences rather than
declaring separate models. This rule checks model reuse, not structural equality.
It checks both `200` and `201` when present; it does not require those status codes.
Bodies without an identifiable named resource model are not compared.

#### ✅ Correct

```typespec
@armProviderNamespace
namespace Microsoft.Example;

model Widget
  is TrackedResource<{
    value?: string;
  }> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  createOrReplace is ArmResourceCreateOrReplaceSync<Widget>;
}
```

#### ❌ Incorrect

The request override below uses a separate input model instead of `Widget`.

```typespec
@armProviderNamespace
namespace Microsoft.Example;

model Widget
  is TrackedResource<{
    value?: string;
  }> {
  ...ResourceNameParameter<Widget>;
}

model WidgetInput {
  value?: string;
}

@armResourceOperations
interface Widgets {
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrReplace is Azure.ResourceManager.Foundations.ArmCreateOperation<
    ResourceInstanceParameters<Widget>,
    WidgetInput,
    ArmResponse<Widget> | ArmCreatedResponse<Widget>,
    ErrorResponse
  >;
}
```

## Impact

- **Area:** API, SDK

A missing request body prevents callers from supplying the resource to create
or replace. Separate input and response models fragment the resource contract
and make it harder for clients to reuse models across operations.

## Suppression

For an existing API that intentionally uses a separate request model and cannot
change compatibly, suppress the warning with a justification. For new APIs, use
the standard ARM template shown above.

```typespec
@armProviderNamespace
namespace Microsoft.Example;

model Widget
  is TrackedResource<{
    value?: string;
  }> {
  ...ResourceNameParameter<Widget>;
}

model WidgetInput {
  value?: string;
}

@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/put-resource-schema-consistency" "Existing API uses a separate request model."
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrReplace is Azure.ResourceManager.Foundations.ArmCreateOperation<
    ResourceInstanceParameters<Widget>,
    WidgetInput,
    ArmResponse<Widget> | ArmCreatedResponse<Widget>,
    ErrorResponse
  >;
}
```

## LintDiff Equivalent

This native rule combines the resource-reuse intent of
[`PutRequestResponseSchemeArm`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#putrequestresponseschemearm),
[`ConsistentResponseSchemaForPut`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#consistentresponseschemaforput),
and [`XmsResourceInPutResponse`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#xmsresourceinputresponse).
