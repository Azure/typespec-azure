---
title: "valid-query-parameters-for-point-operations"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations
```

ARM point operations using GET, PUT, PATCH, or DELETE must not define query parameters other than `api-version`.

## Impact

- **Area:** API, SDK

Additional query parameters on point operations make the resource contract inconsistent with ARM RPC guidance and can complicate generated SDK method signatures.

## LintDiff Equivalent

This rule corresponds to the Swagger linter rule [ValidQueryParametersForPointOperations](https://github.com/Azure/azure-openapi-validator/blob/main/docs/valid-query-parameters-for-point-operations.md).

#### ❌ Incorrect

```tsp
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}")
interface Widgets {
  @get
  get(
    @path subscriptionId: string,
    @path resourceGroupName: string,
    @path widgetName: string,
    @query("api-version") apiVersion: string,
    @query expand?: string,
  ): Widget;
}
```

#### ✅ Correct

```tsp
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}")
interface Widgets {
  @get
  get(
    @path subscriptionId: string,
    @path resourceGroupName: string,
    @path widgetName: string,
    @query("api-version") apiVersion: string,
  ): Widget;
}
```

Query parameters remain valid on collection operations because they are outside this rule's scope:

```tsp
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets")
interface Widgets {
  @get
  list(
    @path subscriptionId: string,
    @path resourceGroupName: string,
    @query("api-version") apiVersion: string,
    @query top?: int32,
  ): WidgetListResult;
}
```

## Suppression

Do not suppress this rule unless the operation is intentionally exempt from ARM RPC guidance. Remove the additional query parameter or model the API as a collection or action operation when that better reflects its semantics.
