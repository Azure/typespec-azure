The success response for a PUT create or update operation must be an ARM resource model.
Define the response using a standard resource template such as `TrackedResource` or
`ProxyResource` and use the corresponding resource operation templates. Declaring properties
named `name` and `type` alone does not make a model an ARM resource.

The rule selects the first model body in a 200 response, falling back to a 201 model when
there is no 200 model. It uses the presence of both `name` and `type` properties, directly or
through inheritance, as a heuristic to identify responses to check. For those models, it
checks that the ARM library recognizes the model as an ARM resource. Other response statuses,
scalar bodies, and models without both properties are outside this check.

Each PUT is checked separately. Operations sharing a response model that is not an ARM resource
produce separate warnings on that model. The rule checks the current TypeSpec semantic program,
not reconstructed historical versions. An instantiated operation template and its concrete
alias are separate visited operation nodes and can produce repeated warnings.

This rule is available for ARM specifications and is disabled by default in the Azure
resource-manager ruleset. When selected, it checks project operations in ordinary, nested,
and global namespaces without requiring a provider decorator as an applicability marker.

## Impact

- **Area:** API, SDK, Tooling

Returning a model that is not an ARM resource from a PUT create or update operation violates
the ARM modeling contract and prevents resource-aware emitters, SDK generators, and other
tooling from recognizing the response as an ARM resource.

#### ❌ Incorrect

The response has `name` and `type` properties, but is not an ARM resource model:

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
model WidgetProperties {
  displayName?: string;
}
model Response {
  name: string;
  type: string;
}

@armResourceOperations
interface Widgets {
  @put
  @armResourceCreateOrUpdate(Widget)
  create(...ResourceInstanceParameters<Widget>, @bodyRoot resource: Widget):
    | ArmResponse<Response>
    | ErrorResponse;
}
```

#### ✅ Correct

The standard operation template returns the ARM resource model:

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
model WidgetProperties {
  displayName?: string;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
```

## Suppression

Suppress only when preserving an existing, ARM-reviewed API whose response intentionally cannot
use an ARM resource model. Otherwise, define the response with `TrackedResource` or
`ProxyResource` and use the corresponding standard resource operation template.

## LintDiff Equivalent

This rule covers the native resource-identity portion of
[XmsResourceInPutResponse](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/xms-resource-in-put-response.md).
Exact Swagger equivalence is partial: that validator checks arbitrary selected schemas and
their `x-ms-azure-resource` metadata. This rule instead checks models with `name` and `type`
properties and requires the ARM library to recognize them as resources. OpenAPI extension
overrides and Legacy escape hatches do not provide an exemption; they are already rejected by
the Azure `no-openapi` and `no-legacy-usage` rules.
