Only tracked resources support ARM tags. This rule checks the resource envelope of registered
non-tracked ARM resources, including proxy and extension resources. It does not check the
resource-specific `properties` bag: a field named `properties.tags` does not represent ARM tags.
Use a tracked resource when ARM tags are required.

The rule checks JSON property names, including names assigned with `@encodedName`.

## Impact

- **Area:** API

Declaring envelope `tags` on a non-tracked resource violates the ARM resource contract and can
mislead callers into expecting support for Azure Resource Manager tag operations.

## Code fix

The **Delete property** quick fix removes a property declared directly on the non-tracked resource
envelope. Properties inherited or copied from another model, properties on reusable resource
templates require a manual fix to avoid changing shared declarations.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model Widget is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
  tags?: Record<string>;
}

model WidgetProperties {
  description?: string;
}
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model Widget is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {
  description?: string;
}
```

## Suppression

Do not suppress this rule for new APIs. Remove the envelope property, or use a tracked resource if
ARM tags are required. Suppress only to preserve an existing API contract with an exception approved
by an ARM reviewer. Place the directive above the offending property and explain the exception:

```tsp
@armProviderNamespace
namespace MyService;

model Widget is ProxyResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
  #suppress "@azure-tools/typespec-azure-resource-manager/no-tags-on-proxy-resource" "Preserve an existing contract with an ARM-approved exception."
  tags?: Record<string>;
}

model WidgetProperties {
  description?: string;
}
```

## LintDiff Equivalent

This rule corresponds to
[TagsAreNotAllowedForProxyResources](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/tags-are-not-allowed-for-proxy-resources.md).
Unlike the Swagger rule's emitted-shape heuristic and nested-properties scan, this rule checks only
registered non-tracked resource envelopes.
