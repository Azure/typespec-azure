Azure APIs should use [next-link pagination](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections-include-nextlink-for-more-results) instead of raw continuation tokens. Return an absolute URL marked `@nextLink` that includes all query parameters required to retrieve the next page.

This rule warns on uses of the TypeSpec `@continuationToken` decorator, including correctly paired request and response tokens. It is an Azure design guideline, not a check that the token annotations are paired. Generic TypeSpec supports token-based pagination.

This is the shared paging-policy portion of `list-response-envelope`. It does not impose ARM-specific response property names or collection-path checks on data-plane APIs. Data-plane responses may use other item names and additional response properties.

The `data-plane` ruleset enables this Azure Core rule. The `resource-manager` ruleset enables the [ARM `list-response-envelope` rule](https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope/) instead, which reuses this policy and also validates ARM response envelopes. The core rule is disabled there to avoid duplicate token warnings.

#### ❌ Incorrect

```tsp
@list
op listWidgets(@query @continuationToken token?: string): {
  @pageItems value: Widget[];
  @continuationToken token?: string;
};
```

#### ✅ Correct

```tsp
@list
op listWidgets(): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
};
```

These examples assume `TypeSpec.Http` is in scope and a `Widget` model is defined. Opaque tokens inside the next-link URL are allowed. The rule does not infer paging behavior from property names such as `continuationToken` or `skipToken`.

## Impact

- **Area:** API, SDK

Raw token pagination deviates from Azure's standard next-link contract. Mixing a raw token parameter with a next-link response can also expose incompatible resume values in generated SDK APIs: the method parameter accepts a raw token, while the pager resumes using the next-link URL.

## Suppression

Suppression is acceptable for established APIs that must preserve token-based pagination for compatibility. Keep the actual service contract and valid paging annotations; removing only `@continuationToken` can prevent SDKs from recognizing token-based paging and is not a migration to next-link pagination.

Place the directive on each annotated property that must retain the decorator. For new APIs, use `@nextLink` and avoid exposing a redundant raw token parameter.

```tsp
model LegacyPage {
  @pageItems value: Widget[];
  #suppress "@azure-tools/typespec-azure-core/list-response-envelope" "Preserve the published token-based paging contract."
  @continuationToken token?: string;
}
```

For ARM APIs using the combined ARM rule, use `@azure-tools/typespec-azure-resource-manager/list-response-envelope` in the suppression directive instead. When configuring rules individually, enable only the ARM variant rather than both variants.
