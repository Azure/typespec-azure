ARM collection GET operations may use only the standard `api-version` and `$filter` query parameters. Additional query parameters make list operations inconsistent across resource providers and introduce nonstandard method parameters in generated SDKs.

The rule applies to GET operations whose emitted ARM path identifies a resource collection. Query parameter names are case-sensitive, so `$FILTER` is not equivalent to `$filter`.

## Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

@route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
@get
op listWidgets(
  @path subscriptionId: string,
  @query("api-version") apiVersion: string,
  @query continuationToken?: string,
): void;
```

## Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

@route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
@get
op listWidgets(
  @path subscriptionId: string,
  @query("api-version") apiVersion: string,
  @query("$filter") filter?: string,
): void;
```

## LintDiff Equivalent

This rule is the native TypeSpec equivalent of the Swagger validator rule [QueryParametersInCollectionGet](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/query-parameters-in-collection-get.ts).
