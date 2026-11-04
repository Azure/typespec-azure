SDK method names should not repeat their operation group name. The group already provides that
context: prefer `client.widgets.get()` to `client.widgets.getWidget()`.

This rule checks the common SDK names of methods and their immediate owning subclient, for both ARM
and data-plane services. It includes names set with `@clientName`, `@client`, and `@clientLocation`.
Root clients do not represent operation groups and are not checked. Language-specific name overrides
do not change the common-name policy.

The comparison is case-sensitive and checks for the group name anywhere in the method name. A final
lowercase `s` in the group name is optional: both `listPath` and `listPaths` repeat `Paths`. Other
plural forms are not inferred. Names are literal text, not regular expressions.

## Examples

These ARM examples use the standard read operation. The operation name is the only customization
needed to demonstrate the naming problem.

### Incorrect

```tsp
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Contoso;

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") name: string;
}
model WidgetProperties {
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Widgets {
  getWidget is ArmResourceRead<Widget>;
}
```

### Correct

```tsp
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Contoso;

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") name: string;
}
model WidgetProperties {
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

For data-plane resources, use the same naming pattern with Azure Core operations.

### Data-plane incorrect

```tsp
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Rest;
using Azure.Core;
using Azure.Core.Traits;

@service
namespace Contoso;

@resource("widgets")
model Widget {
  @key id: string;
}

alias Operations = Azure.Core.ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;
interface Widgets {
  getWidget is Operations.ResourceRead<Widget>;
}
```

### Data-plane correct

```tsp
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Rest;
using Azure.Core;
using Azure.Core.Traits;

@service
namespace Contoso;

@resource("widgets")
model Widget {
  @key id: string;
}

alias Operations = Azure.Core.ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;
interface Widgets {
  get is Operations.ResourceRead<Widget>;
}
```

## Compatibility

Renaming a published SDK method can break callers. For a shipped method that cannot be renamed,
document the compatibility reason in a suppression on the operation:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/no-redundant-operation-group-name" "Preserve the shipped SDK method name."
getWidget is ArmResourceRead<Widget>;
```

## LintDiff Equivalent

This rule addresses the SDK naming intent of
[`OperationIdNounVerb`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/operation-id-noun-verb.md).
It checks common SDK names and actual client ownership, not serialized operation IDs. It treats names
as literal text rather than regular expressions. These intentional boundaries can produce different
findings from the Swagger validator.
