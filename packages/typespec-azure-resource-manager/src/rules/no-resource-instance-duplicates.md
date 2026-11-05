This rule warns when `resolveArmResources` returns distinct resources with the same ARM resource type and resource instance path. It compares provider names, resource type segments, and instance paths case-insensitively, retaining path parameter names. For example, `{partName}` and `{PartName}` match, but `{partName}` and `{name}` do not.

Mixed legacy and standard operation templates can derive different logical resource names for the same instance, splitting its operations between separate resource records. Use consistent templates or explicitly align the legacy resource name with the standard resource name. Different scopes, parent paths, extension targets, or singleton names remain distinct instances.

The examples below use these resource declarations:

```typespec
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@parentResource(Widget)
model Part is ProxyResource<{}> {
  ...ResourceNameParameter<Part>;
}
```

## ❌ Incorrect

The legacy PUT derives the resource name `WidgetsParts`, while the standard read and list use `Part`. Both records have the same resource type and instance path.

```typespec
@armResourceOperations
interface PartsLegacy
  extends Azure.ResourceManager.Legacy.LegacyOperations<
      {
        ...ApiVersionParameter,
        ...SubscriptionIdParameter,
        ...ResourceGroupParameter,
        ...Azure.ResourceManager.Legacy.Provider,

        @path
        @segment("widgets")
        @key
        widgetName: string,
      },
      {
        @path
        @segment("parts")
        @key
        partName: string,
      }
    > {}

@armResourceOperations
interface Parts {
  get is ArmResourceRead<Part>;
  createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
  list is ArmResourceListByParent<Part>;
}
```

## ✅ Correct

Use standard templates consistently so all operations resolve to the same resource instance:

```typespec
@armResourceOperations
interface Parts {
  get is ArmResourceRead<Part>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<Part>;
  list is ArmResourceListByParent<Part>;
}
```

If legacy routing must be retained, supply `ResourceName = "Part"` to `LegacyOperations` instead. Aligning logical names does not change the HTTP path; verify that the existing API contract is preserved when replacing templates.

## Impact

- **Area:** Emitters

Duplicate resource records give Bicep and other consumers of `resolveArmResources` an inconsistent resource graph. Lifecycle and list operations for one instance can be split between records, causing incomplete or ambiguous generated resource definitions. This rule diagnoses the authoring conflict; it does not merge records or alter resolver behavior.

The rule reports one warning on an identity operation from each duplicate record after the first, preferring a read operation and otherwise a create/update operation. It does not report every conflicting pair. Library declarations and synthetic ancestors without their own identity operations are not diagnostic targets.

The rule is included in the ARM library's `all` ruleset but disabled in the central `resource-manager` ruleset pending fixes to existing service specifications. Enable it explicitly in `tspconfig.yaml` to check a service before rollout:

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-resource-manager/no-resource-instance-duplicates": true
```

## Suppression

Prefer consistent operation templates or explicitly aligned resource names. Suppression is acceptable only when an ARM reviewer approves intentionally retaining separate logical resource records and the consuming emitter can handle them. Place the directive above the operation named by the diagnostic, not above the resource model:

```typespec
@armResourceOperations
interface Parts {
  get is ArmResourceRead<Part>;
  #suppress "@azure-tools/typespec-azure-resource-manager/no-resource-instance-duplicates" "ARM reviewer approved legacy logical names; the consumer handles split records."
  createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
  list is ArmResourceListByParent<Part>;
}
```
