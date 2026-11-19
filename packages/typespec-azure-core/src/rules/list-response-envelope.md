This rule warns when a `@list` operation has a request property marked `@continuationToken` but no response property marked `@continuationToken`. It includes inherited and nested properties and reports once on the defining operation, even when multiple interfaces inherit it.

The warning also applies when the response has `@nextLink`. That is valid generic TypeSpec: the URL can contain the token. The Azure SDK concern is that the method may accept a raw token while the pager exposes a next-link URL as its continuation value. Review the generated SDK and service contract rather than treating this as a compiler error.

This is not a blanket ban on token-based pagination. Paired request/response tokens are allowed, including alongside `@nextLink`. Response-only tokens, unused annotated models, and operations without `@list` are outside this check. The rule does not infer annotations from property names.

Both the `data-plane` and `resource-manager` rulesets enable this focused Azure Core rule. The broader [ARM `list-response-envelope` rule](https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope/) reuses the check but keeps its additional collection and response-envelope restrictions opt-in. If enabling the combined ARM rule explicitly, disable the core variant to avoid duplicate warnings; ARM `all` does this when extended after core presets.

#### ❌ Request-only token requiring review

```tsp
@list
op listWidgets(@query @continuationToken token?: string): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
};
```

#### ✅ Next-link contract without a separate raw token parameter

```tsp
@list
op listWidgets(): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
};
```

Azure guidelines [prefer next-link pagination](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections-include-nextlink-for-more-results). The URL may contain opaque token query parameters. Remove a separate public request parameter only when compatible with the service and SDK contract.

#### ✅ Paired token contract

```tsp
@list
op listWidgets(@query @continuationToken token?: string): {
  @pageItems value: Widget[];
  @continuationToken token?: string;
};
```

Only annotate a response token if the service actually returns one. These examples assume `TypeSpec.Http` is in scope and a `Widget` model is defined.

## Impact

- **Area:** SDK

A request-only raw token can coexist with a URL-valued pager continuation token. Callers may pass the pager's value to a method parameter expecting a different format. The warning identifies this potential SDK usability issue, not an invalid HTTP paging protocol.

## Suppression

Suppress the warning on the operation when compatibility requires the existing contract or SDK review confirms that its resume behavior is intentional. Do not remove only the decorator to silence the warning: the ordinary method parameter remains, and SDKs may lose useful paging metadata. Do not invent a response token that the service does not return.

```tsp
#suppress "@azure-tools/typespec-azure-core/list-response-envelope" "Preserve the published request-token contract; pager resume values are documented separately."
@list
op listWidgets(@query @continuationToken token?: string): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
};
```

When opting into the combined ARM rule, use `@azure-tools/typespec-azure-resource-manager/list-response-envelope` instead.
