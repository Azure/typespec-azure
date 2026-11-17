Tracked ARM resources must provide PUT and PATCH lifecycle operations. PATCH should support updating tags.
The rule is opt-in in the central `resource-manager` ruleset. For versioned resources, it reports the API versions where a required operation is missing, using each consuming service's versions for shared resources.

## Impact

- **Area:** API

Without these operations, clients cannot create or update the tracked resource.

## ❌ Incorrect

For an existing tracked resource `Widget` with `WidgetProperties`, this interface omits PATCH:

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
```

## ✅ Correct

Add the standard PATCH operation alongside PUT:

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmResourcePatchSync<Widget, WidgetProperties>;
}
```

## Suppression

Prefer providing both operations. Suppress this rule on the resource model only when an ARM reviewer approves the exception; both diagnostics share the same rule ID.

## LintDiff Equivalent

This rule corresponds to [TrackedResourcesMustHavePut](https://github.com/Azure/azure-openapi-validator/blob/main/docs/tracked-resources-must-have-put.md) and [TrackedResourcePatchOperation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/tracked-resource-patch-operation.md). It checks registered tracked resources and their ARM lifecycle operations rather than inferring resources from Swagger response schemas. PATCH must use each selected resource item path. A private endpoint connection proxy item path is exempt from the PATCH requirement, not the PUT requirement. PATCH request bodies are checked separately by `arm-resource-patch`. When no version selection is available for a versioned operation or its interface, the rule requires it to be available across all of its versions.
