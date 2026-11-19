Do not define multiple resources with the same ARM resource type and resource path. Resource types and paths are compared case-insensitively, including path parameter names. For example, `{partName}` and `{PartName}` match, but `{partName}` and `{name}` do not.

Mixed legacy and standard operation templates can derive different logical resource names for the same instance, splitting its operations between separate resource records. Use consistent templates or explicitly align the legacy resource name with the standard resource name. Different scopes, parent paths, extension targets, or singleton names remain distinct instances.

The examples below use these resource declarations:

```typespec
model WidgetProperties {
  label?: string;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@parentResource(Widget)
model Part is ProxyResource<PartProperties> {
  ...ResourceNameParameter<Part>;
}

model PartProperties {
  description?: string;
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

Legacy interface templates are for older APIs that expose the same resource type at multiple fixed paths, with each path representing a distinct resource, or for non-standard resource paths. For example, a `Widget` resource model might be used in operations at the path `/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/locations/{location}/widgets/{widgetName}`, representing one resource, and might also be used in operations at the path `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/entities/{entityName}/widgets/{widgetName}`, representing a different resource. Use the legacy interface template for every operation using the resource type at that path.

If an older API uses a non-standard operation pattern unrelated to the resource path, such as an optional request body for PUT or PATCH operations or a non-pageable response for list operations, use the operation templates in `Azure.ResourceManager.Legacy` instead. These operation templates may be freely mixed with standard operation templates for operations over the same resource. These operations are described in this table:

| Template                                                       | Description                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `CreateOrReplaceSync`, `CreateOrReplaceAsync`                  | Create or replace a resource; set `OptionalRequestBody = true` to make the request body optional.                  |
| `CustomPatchSync`, `CustomPatchAsync`                          | Update a resource with a custom PATCH payload; set `OptionalRequestBody = true` to make the request body optional. |
| `ArmListSinglePageByParent`, `ArmListSinglePageBySubscription` | List resources in a single page without a pageable response.                                                       |

Make the `createOrUpdate` request body optional:

```typespec
@armResourceOperations
interface Parts {
  get is ArmResourceRead<Part>;
  createOrUpdate is Azure.ResourceManager.Legacy.CreateOrReplaceSync<
    Part,
    OptionalRequestBody = true
  >;
  list is ArmResourceListByParent<Part>;
}
```

If legacy routing must be retained, set the `ResourceName` parameter on the `LegacyOperations` interface template to the name of the resource model. Replace the `PartsLegacy` interface defined above with:

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
      },
      ResourceName = "Part"
    > {}

@armResourceOperations
interface Parts {
  get is ArmResourceRead<Part>;
  createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
  list is ArmResourceListByParent<Part>;
}
```

This aligns the resource names without changing the HTTP path.

## Impact

- **Area:** Emitters

Duplicate resource records give Bicep templates, provisioning libraries, and other consumers of resource metadata an inconsistent resource graph. Lifecycle and list operations can be identified with the wrong resource, causing incorrect Bicep templates or generated resource definitions.

## Suppression

Prefer consistent operation templates or explicitly aligned resource names. Suppression is acceptable only when an ARM reviewer approves intentionally retaining separate logical resource records and the consuming emitter can handle them. Place the directive above the operation named by the diagnostic, not above the resource model:

```typespec
@armResourceOperations
interface Parts {
  get is ArmResourceRead<Part>;
  #suppress "@azure-tools/typespec-azure-resource-manager/no-resource-duplicates" "ARM reviewer approved legacy logical names; the consumer handles split records."
  createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
  list is ArmResourceListByParent<Part>;
}
```
