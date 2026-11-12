ARM collection GET and list operations may use only the standard `api-version` and `$filter` query parameters. Additional query parameters make list operations inconsistent across resource providers and introduce nonstandard method parameters in generated SDKs.

The rule applies to operations marked `@list` regardless of their HTTP method or path, as well as GET operations whose emitted ARM path identifies a resource collection, even without `@list`. Query parameter names are case-sensitive, so `$FILTER` is not equivalent to `$filter`.

Assume `WidgetPage` is a list response with `@pageItems` metadata. The first example is a collection GET; the second is an operation marked `@list`.

## Incorrect

### Collection GET

```tsp
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
@get
op listWidgets(
  @path subscriptionId: string,
  @query("api-version") apiVersion: string,
  @query continuationToken?: string,
): void;
```

### List operation

```tsp
@route("/widgets/search")
@post
@list
op searchWidgets(@query continuationToken?: string): WidgetPage;
```

## Correct

### Collection GET

```tsp
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
@get
op listWidgets(
  @path subscriptionId: string,
  @query("api-version") apiVersion: string,
  @query("$filter") filter?: string,
): void;
```

### List operation

```tsp
@route("/widgets/search")
@post
@list
op searchWidgets(@query("$filter") filter?: string): WidgetPage;
```

## LintDiff Equivalent

This rule is the native TypeSpec equivalent of the Swagger validator rule [QueryParametersInCollectionGet](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/query-parameters-in-collection-get.ts).
