An ARM PUT success response must describe an Azure resource. Prefer the standard resource models and operation templates so the resource metadata is available to emitters and client generators.

The rule checks the body-bearing 200 response, falling back to 201 when 200 has no body. A resource marker anywhere in the payload's model inheritance chain satisfies the check. Standard ARM resource bases, common resource types, custom-resource marker options and explicit OpenAPI extension overrides are respected. Separately named models and resource-looking fields do not establish resource metadata.

The check also applies to custom PUT operations in an ARM provider namespace, including operations authored with action templates. Such templates do not exempt a PUT response from resource policy. Bodyless responses and response status-code validation remain the responsibility of other rules.

This rule is opt-in in the shared `resource-manager` ruleset. Enable it explicitly:

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-resource-manager/arm-put-response-resource": true
```

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model WidgetResult {
  value?: string;
}

@armResourceOperations
interface Widgets {
  @put
  @armResourceCreateOrUpdate(Widget)
  create(...ResourceInstanceParameters<Widget>, @bodyRoot body: Widget): ArmResponse<WidgetResult>;
}
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  create is ArmResourceCreateOrReplaceSync<Widget>;
}
```

## Existing API exceptions

Do not add resource fields or change an existing command, collection or secret payload merely to satisfy this rule. If the existing service contract intentionally returns a non-resource result, suppress the diagnostic on that operation with a specific justification.

## Swagger migration

This check addresses the resource-marker policy of [XmsResourceInPutResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-resource-in-put-response.md). It is separate from `arm-resource-operation-response`, which validates consistency against a registered canonical resource model.
