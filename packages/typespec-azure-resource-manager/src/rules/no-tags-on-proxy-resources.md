Proxy resources do not support ARM tags. Declaring a JSON property named `tags` on either the
resource envelope or its resource-specific properties can give callers the false impression that the
resource participates in Azure Resource Manager tag operations. Use a tracked resource when tags are
required.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model Widget is ProxyResource<WidgetProperties> {
  @key @segment("widgets") name: string;
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
  @key @segment("widgets") name: string;
}

model WidgetProperties {
  description?: string;
}
```

## LintDiff Equivalent

This rule is the TypeSpec equivalent of
[TagsAreNotAllowedForProxyResources](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/tags-are-not-allowed-for-proxy-resources.md).
