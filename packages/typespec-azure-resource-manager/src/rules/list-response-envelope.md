ARM collection GET responses must use a predictable envelope containing exactly `value` and
`nextLink`. Additional top-level properties or a missing envelope property make generated clients
and pagination tooling handle list operations inconsistently.

## Impact

- **Area:** API

Collection response envelopes with other shapes violate the ARM RPC contract and can produce
inconsistent generated client pagination behavior.

## ❌ Incorrect

```tsp
model WidgetListResult {
  value: Widget[];
  nextLink?: string;
  totalCount?: int32;
}

@route("/subscriptions/{subscriptionId}/providers/Contoso.Widgets/widgets")
@get
op listWidgets(@path subscriptionId: string): WidgetListResult;
```

## ✅ Correct

```tsp
model WidgetListResult {
  value: Widget[];
  nextLink?: string;
}

@route("/subscriptions/{subscriptionId}/providers/Contoso.Widgets/widgets")
@get
op listWidgets(@path subscriptionId: string): WidgetListResult;
```

## LintDiff Equivalent

This rule corresponds to the Swagger validator rule
[GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts).

## Suppression

Suppress this rule only when compatibility requirements prevent the response envelope from
containing exactly `value` and `nextLink`.
