Use a registered ARM resource model for a PUT operation's resource-shaped success response.
Standard resource templates provide resource identity that Azure tooling can recognize;
declaring properties named `name` and `type` alone does not register a resource.

The rule selects the first model body in a 200 response, falling back to a 201 model when
there is no 200 model. If that model has both `name` and `type` properties, directly or through
inheritance, it must be registered as an ARM resource. For example, define it with
`TrackedResource` or `ProxyResource` and use the corresponding resource operation templates.
Other response statuses, scalar bodies, and models without both properties are outside this
resource-model check.

Each PUT is checked separately. Operations sharing an unregistered response model produce
separate warnings on that model. The rule checks the current TypeSpec semantic program,
not reconstructed historical versions. An instantiated operation template and its concrete
alias are separate visited operation nodes and can produce repeated warnings.

This rule is available for ARM specifications and is disabled by default in the Azure
resource-manager ruleset. When selected, it checks project operations in ordinary, nested,
and global namespaces without requiring a provider decorator as an applicability marker.

#### ❌ Incorrect

The response resembles a resource, but is not a registered resource model:

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

The standard operation template returns the registered resource:

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

## LintDiff Equivalent

This rule covers the native resource-identity portion of
[XmsResourceInPutResponse](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/xms-resource-in-put-response.md).
Exact Swagger equivalence is partial: that validator checks arbitrary selected schemas and
their `x-ms-azure-resource` metadata. This rule instead checks resource-shaped models and
registered ARM identity. OpenAPI extension overrides and Legacy escape hatches do not provide
an exemption; they are already rejected by the Azure `no-openapi` and `no-legacy-usage` rules.
