ARM list responses must use a predictable envelope containing exactly an array-valued `value` and
`nextLink`. Additional top-level properties or a missing envelope property make generated clients
and pagination tooling handle list operations inconsistently.

This rule also reuses Azure Core's shared `list-response-envelope` paging policy: it warns on `@continuationToken` usage in request parameters and response properties, including correctly paired tokens. A request token is still reported when the response has a valid `value`/`nextLink` envelope. This is Azure policy, not a generic TypeSpec validity requirement.

The `resource-manager` ruleset enables this combined rule, including the existing ARM envelope checks, and disables the core variant to avoid duplicate token diagnostics. The `data-plane` ruleset enables only the core variant, without ARM-specific envelope restrictions.

## Impact

- **Area:** API, SDK

Collection response envelopes with other shapes violate the ARM RPC contract and can produce
inconsistent generated client pagination behavior.

Mixing a raw request token with a next-link response can also expose incompatible resume values in generated SDK APIs.

The rule combines collection-path and paging-metadata checks under the existing
`list-response-envelope` rule name. ARM-provider collection GET paths retain their
envelope validation. Authored `@list` operations with a paging `@nextLink` are also
checked, including POST list actions and operations without provider metadata.
Inherited envelope properties are included. The `value` property must be an array,
and the next-link property must be named `nextLink`, not a custom envelope name.
Prefer standard ARM list operation templates, which provide this envelope.

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

### Consolidated list-response coverage

The checks formerly proposed as `list-response-value-array` are part of the existing `list-response-envelope` rule; its public name is retained.

| Migrated lintdiff rule                                                                                                                                                                     | Coverage in this existing TypeSpec rule                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts) | Checks that eligible collection response models have exactly the `value` and `nextLink` envelope properties, including inherited properties. |
| [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md)                                                 | Requires the `value` property to be an array and combines that requirement with the standard envelope names.                                 |

Both applicability populations are retained: ARM-provider collection GET paths and authored `@list` operations whose paging metadata has a `@nextLink`, including POST actions and provider-free operations. Checks use HTTP 200 response bodies. Paging metadata alone does not prove the array or envelope shape; `list-operation-missing-pageable` remains a separate metadata check.

The combined native contract intentionally rejects a custom next-link property name even when it has valid paging metadata. These mappings describe TypeSpec response models and metadata, not emitted Swagger inspection or unchanged historical diagnostic counts.

## Suppression

Suppress this rule only when compatibility requirements prevent the standard response envelope or require preserving token-based pagination. Keep valid paging annotations; removing `@continuationToken` merely to silence the warning can prevent SDKs from recognizing the actual service contract.

Token diagnostics target annotated properties. Suppress each token property that must retain the decorator:

```tsp
model LegacyOptions {
  #suppress "@azure-tools/typespec-azure-resource-manager/list-response-envelope" "Preserve the published token-based paging contract."
  @continuationToken token?: string;
}
```

Envelope diagnostics retain their existing response model/property targets. A property-level token suppression does not disable envelope validation.
