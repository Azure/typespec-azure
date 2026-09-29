Paginated ARM list responses must have a `value` property whose type is an array. Use `@pageItems` on
the `value` property so the returned items have a predictable shape for clients and pagination
tooling. The rule checks list operations with a next-link property, including paginated POST
actions and list response overrides. Standard ARM list response templates already provide the
required property.

## Impact

- **Area:** API, SDK

A missing or non-array `value` property makes the paged response inconsistent with standard ARM
collection responses and can prevent clients from processing the returned items reliably.

## ❌ Incorrect

```tsp
model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model WidgetPage {
  @pageItems items: Widget[];
  @nextLink nextLink?: string;
}

@armResourceOperations
interface Widgets {
  listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetPage>>;
}
```

## ✅ Correct

```tsp
model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model WidgetPage {
  @pageItems value: Widget[];
  @nextLink nextLink?: string;
}

@armResourceOperations
interface Widgets {
  listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetPage>>;
}
```

## LintDiff Equivalent

This rule corresponds to the Swagger validator rule
[CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md).

## Suppression

Suppress this rule only when an approved compatibility requirement prevents a paged collection
response from exposing an array named `value`.
