Microsoft documentation links should not force a locale. Removing the locale lets readers see documentation in their preferred language.

This rule checks `https://docs.microsoft.com/<locale>/azure/` links in documentation comments, `@doc`, `@returnsDoc`, and `@errorsDoc`.

## Impact

- **Area:** SDK, API

#### ❌ Incorrect

```tsp
/** See https://docs.microsoft.com/en-us/azure/service-health/resource-health-overview. */
model ResourceHealth {}
```

#### ✅ Correct

```tsp
/** See https://docs.microsoft.com/azure/service-health/resource-health-overview. */
model ResourceHealth {}
```

## Suppression

Suppress the rule when a locale-specific link is necessary:

```tsp
/** See https://docs.microsoft.com/en-us/azure/service-health/resource-health-overview. */
#suppress "@azure-tools/typespec-azure-core/no-localized-doc-links" "The linked content is only available in this locale."
model ResourceHealth {}
```

## LintDiff Equivalent

Based on Swagger's [docLinkLocale](https://github.com/Azure/azure-openapi-validator/blob/main/docs/doc-link-locale.md).
