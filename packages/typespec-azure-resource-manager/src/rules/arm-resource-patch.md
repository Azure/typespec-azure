The request body of a resource PATCH must be a model containing only properties that exist on the resource. If the resource has a `tags` property, include it in PATCH input too.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose writable JSON property names correspond to PUT input. PATCH may omit PUT properties and make properties optional.

Only writable input properties count, including nested and inherited properties and their JSON names. A property hidden from PUT input cannot satisfy PATCH correspondence, even if it exists on the resource model. Expose it in PUT input or remove it from PATCH input.

This check compares names, not types or value constraints. A clean result does not guarantee that PUT accepts every value allowed by PATCH.

## Impact

- **Area:** API

Unexpected PATCH properties can expose inputs that cannot be created or stored through PUT.

## Example resource

Import `@typespec/http` and `@azure-tools/typespec-azure-resource-manager`, with `using TypeSpec.Http;` and `using Azure.ResourceManager;`. In a namespace annotated with `@service` and `@armProviderNamespace`, combine this shared resource with either the incorrect or correct interface below.

```tsp
model Widget
  is TrackedResource<{
    displayName?: string;
  }> {
  ...ResourceNameParameter<Widget>;
}
```

## ❌ Incorrect

`extra` is writable in PATCH but does not exist in PUT input.

```tsp
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmCustomPatchSync<
    Widget,
    PatchModel = {
      tags?: Record<string>;
      properties?: {
        displayName?: string;
        extra?: string;
      };
    }
  >;
}
```

## ✅ Correct

Remove the extra property so that every PATCH input property exists in PUT input.

```tsp
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmCustomPatchSync<
    Widget,
    PatchModel = {
      tags?: Record<string>;
      properties?: {
        displayName?: string;
      };
    }
  >;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise use the standard PATCH operations.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md).

### Consolidated PATCH coverage

The checks formerly proposed as `patch-properties-correspond-to-put` are part of `arm-resource-patch`, not a separate rule to enable.

| Migrated lintdiff rule                                                                                                                                       | Coverage in this existing TypeSpec rule                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                  | The existing resource checks require PATCH input to be a model whose properties are a subset of the resource, including the required tags behavior.                                                                                                                                                                              |
| [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md) | For project PATCH and PUT operations at the same HTTP path, including inherited operations, checks nonempty PATCH input and writable JSON property-name correspondence. Includes nested/inherited properties, encoded names and request visibility; value types, constraints and individual API-version shapes are not compared. |

The paired-endpoint check also applies to custom HTTP operations. Without a matching PUT, only the applicable existing resource checks run. Unsupported body shapes are skipped rather than interpreted as empty objects.

The check permits partial objects and explicit property resets. It does not require whole-schema or annotation/default equality. Value/constraint compatibility and historical API-version behavior are outside this check's scope; this is partial coverage rather than full Swagger equivalence.

`arm-resource-operation-response` and `use-operation-decorator` provide complementary identity and registration checks, not a substitute for writable-input correspondence.
