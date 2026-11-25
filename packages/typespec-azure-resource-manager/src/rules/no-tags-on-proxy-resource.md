Only tracked resources support ARM tags. Resources should not have a `tags` property in the
resource envelope unless they use the `Azure.ResourceManager.TrackedResource` model template
in their definition. If this is intended to be a tracked resource, use the `TrackedResource`
template. If it is not a tracked resource, remove the property.

This rule applies to non-tracked resource envelopes, including proxy and extension resources,
and checks JSON property names, including names assigned with `@encodedName`. It does not check
the resource-specific `properties` bag: a field named `properties.tags` does not represent ARM tags.

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

If the resource is not a tracked resource, remove the envelope `tags` property:

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

If the resource requires ARM tags, use `TrackedResource`. The template provides the `tags`
property; do not redeclare it:

```tsp
@armProviderNamespace
namespace MyService;

model Widget is TrackedResource<WidgetProperties> {
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
