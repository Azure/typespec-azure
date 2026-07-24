```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb
```

For ARM http operations, the action verb must be `@post` or `@get`. Any other action verb is flagged as incorrect.

## Impact

- **Area:** API, SDK

A resource action that does not use POST or GET produces an improper HTTP API and can break the C# SDK and emitters that model resource actions (service, portal).

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [InvalidVerbUsed](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2044).

#### ❌ Incorrect

```tsp
@delete op getAction is ArmProviderActionAsync<
  {
    name: string;
  },
  ArmCombinedLroHeaders,
  SubscriptionActionScope
>;
```

#### ✅ Correct

```tsp
op postAction is ArmProviderActionAsync<
  {
    name: string;
  },
  ArmCombinedLroHeaders,
  SubscriptionActionScope
>;
```

#### ✅ Correct

```tsp
@get op getAction is ArmProviderActionSync<
  {
    name: string;
  },
  ArmCombinedLroHeaders,
  SubscriptionActionScope
>;
```

## Suppression

Suppress only when needed to match an existing API. Use the standard resource action templates and do not override the verb with `@put`, `@patch`, `@delete`, or `@head`.
