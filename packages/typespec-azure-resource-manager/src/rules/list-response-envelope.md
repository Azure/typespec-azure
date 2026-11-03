ARM HTTP 200 list responses must use a predictable envelope containing exactly an array-valued `value` and
`nextLink`. Additional top-level properties or a missing envelope property make generated clients
and pagination tooling handle list operations inconsistently.

## Impact

- **Area:** API

Collection response envelopes with other shapes violate the ARM RPC contract and can produce
inconsistent generated client pagination behavior.

The rule combines collection-path and paging-metadata checks under the existing
`list-response-envelope` rule name. ARM-provider collection GET paths retain their
envelope validation. Authored `@list` operations with a paging `@nextLink` are also
checked, including POST list actions and operations without provider metadata.
Inherited envelope properties are included. The `value` property must be an array,
and the next-link property must be named `nextLink`, not a custom envelope name.
Prefer standard ARM list operation templates, which provide this envelope.

For paged operations, the selected response body must also contain the named next-link
property. Headers and properties excluded by `@bodyIgnore` do not count unless preserved
inside an explicit `@body`. Correspondence uses serialized names in each declared body
media type. Without `@nextLink`, this additional check is skipped.

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

| Migrated lintdiff rule                                                                                                                                                                      | Coverage in this existing TypeSpec rule                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts)  | Checks that eligible collection response models have exactly the `value` and `nextLink` envelope properties, including inherited properties.         |
| [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md)                                                  | Requires the `value` property to be an array and combines that requirement with the standard envelope names.                                         |
| [XmsPageableMustHaveCorrespondingResponse](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/native/legacyRules/XmsPageableMustHaveCorrespondingResponse.ts) | Checks that the selected response body's schema contains the named next-link property; headers and ignored body properties do not satisfy the check. |

Both applicability populations are retained: ARM-provider collection GET paths and authored `@list` operations whose paging metadata has a `@nextLink`, including POST actions and provider-free operations. Strict envelope checks use HTTP 200 response bodies. Paging metadata alone does not prove body correspondence, the array, or the envelope shape; `list-operation-missing-pageable` remains a separate metadata check.

Next-link correspondence selects HTTP 200, otherwise the lowest numeric 2xx response, otherwise a success range, otherwise default. A selected response without a body is skipped. Fallback responses receive only the correspondence check, allowing custom envelope names and additional properties.

The combined native contract intentionally rejects a custom next-link property name for HTTP 200 even when it has valid paging metadata. Warning severity and activation remain unchanged. These mappings describe TypeSpec response models and metadata, not emitted Swagger inspection or unchanged historical diagnostic counts. Checking each declared media type can be stricter than a single Swagger schema in mixed JSON/XML services.

## Suppression

Suppress this rule only when compatibility requirements prevent the response envelope from
containing exactly `value` and `nextLink`, or require a next link outside the selected response body.
