ARM collection operations must use a predictable response envelope and TypeSpec paging metadata. Prefer the standard ARM list operation templates.

## Impact

- **Area:** API, SDK

The rule checks project `@list` operations, including operations inherited by project interfaces, regardless of verb or route. It also checks project GET operations on collection-shaped provider paths, including resource and provider actions and `/operations`. A collection GET must be marked `@list`. Paging metadata is checked independently of HTTP response status. HTTP 200 response envelopes must contain only an array-valued JSON `value` with `@pageItems` and a JSON `nextLink` with `@nextLink`. Inherited properties are included. `@nextLink` may be optional in the response: its absence at runtime indicates there is no next page.

The rule uses four diagnostic message types: missing `@list`, invalid `value` array, paging metadata/name issues, and extra properties. Diagnostics are prioritized per operation: an unmarked collection GET reports only the missing `@list`; otherwise, paging and envelope defects are reported before extra properties. Extra-property and open-indexer diagnostics are emitted only when no paging or envelope defect is found.

The TypeSpec names of paging properties must match their JSON wire names: AutoRest uses the TypeSpec names in emitted paging metadata. For a 200 envelope, name those properties `value` and `nextLink` in TypeSpec as well as JSON; `@encodedName` cannot be used to give differently named paging properties those JSON names.

Every HTTP 200 response alternative is checked, including each member of a union and any explicit status-code range containing 200. Bodyless responses, arrays, scalars, records, files, and multipart bodies do not provide the required envelope. Default (`*`) and non-200 responses are outside this rule's response check.

## ❌ Incorrect

### Unmarked collection and extra response property

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

### List action with a nonstandard item property

```tsp
model WidgetPage {
  @pageItems items: Widget[];
  @nextLink nextLink?: string;
}

@post @list op listWidgets(): WidgetPage;
```

## ✅ Correct

### Custom list operation

```tsp
model WidgetListResult {
  @pageItems value: Widget[];
  @nextLink nextLink?: string;
}

@route("/subscriptions/{subscriptionId}/providers/Contoso.Widgets/widgets")
@get
@list
op listWidgets(@path subscriptionId: string): WidgetListResult;
```

### Standard ARM template

```tsp
@armResourceOperations
interface Widgets {
  listByParent is ArmResourceListByParent<Widget>;
}
```

## LintDiff Equivalent

The rule combines [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts), [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md), and [XmsPageableForListCalls](https://github.com/Azure/azure-openapi-validator/blob/main/docs/xms-pageable-for-list-calls.md). It checks native TypeSpec metadata and response models, not emitted Swagger. The former proposed `list-response-value-array` checks remain part of this rule.

## Migration

The `list-operation-missing-pageable` rule ID has been retired. Replace it with `list-response-envelope` in linter configurations and suppressions, reviewing each suppression because the combined rule also checks envelope shape. The combined rule remains disabled by default in `@azure-tools/typespec-azure-rulesets/resource-manager` and remains part of the ARM library's `all` ruleset.

## Suppression

Suppress this rule only when compatibility requirements prevent the standard collection envelope or paging metadata.
