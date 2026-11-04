List responses must use a predictable envelope containing exactly an array-valued `value` and
`nextLink`. Additional top-level properties or a missing envelope property make generated clients
and pagination tooling handle list operations inconsistently.

## Impact

- **Area:** API

Collection response envelopes with other shapes violate the ARM RPC contract and can produce
inconsistent generated client pagination behavior.

This rule applies to HTTP 200 response models of list operations, including
non-resource lists. Use `@list`, `@listsResource`, or an ARM list operation template
to declare a list operation. A continuation-link decorator is not required for
this rule to check the response envelope.

Inherited envelope properties are included. The `value` property must be an array,
and the next-link property must be named `nextLink`, not a custom envelope name.
Prefer standard ARM list operation templates, which provide this envelope.

## ❌ Incorrect

```tsp
@service
namespace Contoso.Widgets;

model Widget {
  name: string;
}

model WidgetListResult {
  @pageItems value: Widget[];

  @nextLink
  nextLink?: string;

  totalCount?: int32;
}

@list
@get
op listWidgets(): WidgetListResult;
```

## ✅ Correct

```tsp
@service
namespace Contoso.Widgets;

model Widget {
  name: string;
}

model WidgetListResult {
  @pageItems value: Widget[];

  @nextLink
  nextLink?: string;
}

@list
@get
op listWidgets(): WidgetListResult;
```

## LintDiff Equivalent

### Consolidated list-response coverage

The checks formerly proposed as `list-response-value-array` are part of the existing `list-response-envelope` rule; its public name is retained.

| Migrated lintdiff rule                                                                                                                                                                     | Coverage in this existing TypeSpec rule                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts) | Checks that eligible collection response models have exactly the `value` and `nextLink` envelope properties, including inherited properties. |
| [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md)                                                 | Requires the `value` property to be an array and combines that requirement with the standard envelope names.                                 |

Paging metadata is checked separately by `list-operation-missing-pageable`.

The combined native contract intentionally rejects a custom next-link property name even when it has valid paging metadata. These mappings describe TypeSpec response models and metadata, not emitted Swagger inspection or unchanged historical diagnostic counts.

## Suppression

Suppress this rule only when compatibility requirements prevent the response envelope from
containing exactly `value` and `nextLink`.
