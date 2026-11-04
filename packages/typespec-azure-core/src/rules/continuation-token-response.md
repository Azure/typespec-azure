A `@list` operation with a request parameter marked `@continuationToken` must also have a response property marked `@continuationToken`. The rule checks paging metadata, including inherited and nested properties, rather than parameter names. It warns whether or not the response also uses `@nextLink`.

Azure APIs should use [next-link pagination](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections-include-nextlink-for-more-results), with all required query parameters included in the returned URL. A raw token parameter alongside a next-link response exposes two different ways to resume paging.

#### ❌ Incorrect

```tsp
@list
op listWidgets(@query @continuationToken continuationToken?: string): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
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

If an existing service actually returns a raw token instead, annotate both the request parameter and the response token. Do not invent a response property or change the wire contract just to satisfy the rule.

```tsp
@list
op listWidgets(@query @continuationToken continuationToken?: string): {
  @pageItems value: Widget[];
  @continuationToken continuationToken?: string;
};
```

These examples assume `TypeSpec.Http` is in scope and a `Widget` model is defined.

## Impact

- **Area:** SDK

Without a response token, emitters cannot connect the annotated parameter to token-based paging. For example, a generated .NET method can expose a raw token parameter while the pager's continuation token is a next-link URL. Passing the pager's token to that method parameter does not resume paging correctly.

Removing only the decorator leaves the ordinary generated parameter and does not resolve that SDK API ambiguity. Remove the redundant parameter only after checking compatibility with the published service and SDK contracts.

## Suppression

Suppression is acceptable when an established service or SDK contract requires preserving the parameter. Document the compatibility reason and distinguish the raw parameter from the pager's next-link token. For new APIs, prefer next-link paging without the redundant token parameter.

Place the directive on the operation, including when its parameters come from a shared trait:

```tsp
#suppress "@azure-tools/typespec-azure-core/continuation-token-response" "Preserve the published raw token parameter; SDK paging resumes with the nextLink URL."
@list
op listWidgets(@query @continuationToken continuationToken?: string): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
};
```
