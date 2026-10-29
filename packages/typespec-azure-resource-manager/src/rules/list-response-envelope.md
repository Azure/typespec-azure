ARM collection GETs and authored `@list` operations with a `@nextLink` must use a predictable
HTTP 200 response envelope containing exactly an array-valued `value` and `nextLink`.
Additional top-level properties or a missing envelope property make generated clients and
pagination tooling handle list operations inconsistently.

For ARM-provider paging operations, the selected paging response must also contain the
next-link property in its body. Selection prefers 200, otherwise the lowest numeric 2xx
status, otherwise a success status range, otherwise the default response. Selection happens
before inspecting the body: a selected response without a body is skipped, not replaced
by another response. Non-200 responses are checked only for next-link correspondence;
custom property names and additional body properties are allowed.

## Impact

- **Area:** API, SDK

Collection response envelopes with other shapes violate the ARM RPC contract and can produce
inconsistent generated client pagination behavior.

The rule combines collection-path and paging-metadata checks under the existing
`list-response-envelope` rule name. ARM-provider collection GET paths retain their
envelope validation. Authored `@list` operations with a paging `@nextLink` are also
checked, including POST list actions and operations without provider metadata.
Inherited envelope properties are checked using HTTP payload metadata and Read visibility.
In an implicit body, `@header` and `@bodyIgnore` properties do not count as body members.
Inside an explicit `@body`, these annotations do not remove body members.
For 200 responses, the `value` property must be an array,
and the next-link property must be named `nextLink`, not a custom envelope name.
Prefer standard ARM list operation templates, which provide this envelope.

Given an ARM `Widget` resource, a custom response can accidentally move its next link
out of the body. Keep it as a body property instead.

## ❌ Incorrect

```tsp
model WidgetListResult {
  @pageItems value: Widget[];
  @header @nextLink nextLink?: string;
}

@armResourceOperations
interface Widgets {
  listBySubscription is ArmListBySubscription<Widget, Response = WidgetListResult>;
}
```

## ✅ Correct

```tsp
model WidgetListResult {
  @pageItems value: Widget[];
  @nextLink nextLink?: string;
}

@armResourceOperations
interface Widgets {
  listBySubscription is ArmListBySubscription<Widget, Response = WidgetListResult>;
}
```

## LintDiff Equivalent

### Consolidated list-response coverage

The checks formerly proposed as `list-response-value-array` are part of the existing `list-response-envelope` rule; its public name is retained.

| Migrated lintdiff rule                                                                                                                                                                     | Coverage in this existing TypeSpec rule                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts) | Checks that eligible collection response models have exactly the `value` and `nextLink` envelope properties, including inherited properties.       |
| [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md)                                                 | Requires the `value` property to be an array and combines that requirement with the standard envelope names.                                       |
| [XmsPageableMustHaveCorrespondingResponse](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-pageable-must-have-corresponding-response.md)                               | Partial mapping: ARM semantic next-link paging must have the named property in the selected response body, including successful/default fallbacks. |

Both applicability populations are retained: ARM-provider collection GET paths and authored `@list` operations whose paging metadata has a `@nextLink`, including POST actions and provider-free operations. Checks use HTTP 200 response bodies. Paging metadata alone does not prove the array or envelope shape; `list-operation-missing-pageable` remains a separate metadata check.

The combined native contract intentionally rejects a custom next-link property name even when it has valid paging metadata. These mappings describe TypeSpec response models and metadata, not emitted Swagger inspection or unchanged historical diagnostic counts.

The corresponding-response mapping covers semantic `@list`/`@nextLink` paging in ARM-provider
namespaces, not arbitrary raw `x-ms-pageable` extensions or data-plane/provider-free fallback
responses. Numeric response ordering and skipping absent bodies preserve the legacy selection
boundary; supported success ranges are considered after numeric successes. Native checks use
HTTP payload metadata rather than emitted schema inspection. In particular, Read visibility
can exclude a Create-only property even when an emitter retains it in a shared schema; that
is not claimed as a reproduced legacy violation.

This warning rule retains its public ID and remains disabled in the standard ARM ruleset.
Explicit activation also enables its existing stricter 200 envelope policy, including
provider-free authored paging operations; it is not an independently configurable
correspondence-only check. These boundaries prevent a claim of full legacy equivalence.

## Suppression

Suppress this rule only when compatibility requirements prevent a standard 200 envelope
or a next-link property in the selected paging response body.
