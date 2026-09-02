ARM collection GET operations must use pageable response metadata. Authoring pagination up front
keeps generated SDK list methods consistent and avoids a later breaking change when a service needs
to add continuation links.

Use the standard ARM list operation templates when possible. Custom list operations can use
`@list`, identify the returned items with `@pageItems`, and identify the continuation link with
`@nextLink`. Alternatively, they can explicitly author a truthy `x-ms-pageable` OpenAPI extension.

## ❌ Incorrect

```tsp
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
@get
@armResourceList(Widget)
op listWidgets(@path subscriptionId: string, ...ApiVersionParameter): Widget[];
```

## ✅ Correct

```tsp
model WidgetPage {
  @pageItems
  value: Widget[];

  @nextLink
  nextLink?: url;
}

@route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
@get
@list
@armResourceList(Widget)
op listWidgets(@path subscriptionId: string, ...ApiVersionParameter): WidgetPage;
```

## LintDiff Equivalent

This rule is equivalent to the Swagger validator rule
[XmsPageableForListCalls](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-pageable-for-list-calls.md).
