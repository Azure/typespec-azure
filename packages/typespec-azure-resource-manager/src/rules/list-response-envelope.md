ARM collection operations must use a predictable response envelope and TypeSpec paging metadata. Prefer the standard ARM list operation templates.

This rule also reuses Azure Core's focused `list-response-envelope` warning: a `@list` operation with a request `@continuationToken` but no response `@continuationToken` needs SDK contract review. This includes next-link responses, which are valid generic TypeSpec but may expose URL-valued pager continuation values alongside a raw token parameter. Paired tokens do not trigger this warning; the opt-in ARM envelope and metadata requirements still apply independently.

Both the `data-plane` and `resource-manager` rulesets enable only the focused Azure Core variant. This combined ARM rule remains opt-in and is included in ARM `all`. When enabling it explicitly, disable the core variant to avoid duplicate warnings. ARM `all` does this when extended after core presets.

## Impact

- **Area:** API, SDK

The rule checks project `@list` operations, including operations inherited by project interfaces, regardless of verb or route. It also checks project GET operations on collection-shaped provider paths, including resource and provider actions and `/operations`. A collection GET must be marked `@list`. Paging metadata is checked independently of HTTP response status. HTTP 200 response envelopes must contain only an array-valued JSON `value` with `@pageItems` and a JSON `nextLink` with `@nextLink`. Inherited properties are included. `@nextLink` may be optional in the response: its absence at runtime indicates there is no next page.

Mixing a raw request token with a next-link response can also expose incompatible resume values in generated SDK APIs.

The rule uses five diagnostic message types: request-only continuation tokens, missing `@list`, invalid `value` array, paging metadata/name issues, and invalid response envelopes. Independent operation and response defects can produce multiple diagnostics. Envelope diagnostics target the response model and cover missing or extra properties.

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

The `list-operation-missing-pageable` rule ID has been retired. Replace it with `list-response-envelope` in linter configurations and suppressions, reviewing each suppression because the combined rule also checks envelope shape and request-only continuation tokens. The combined rule remains disabled by default in `@azure-tools/typespec-azure-rulesets/resource-manager` and remains part of the ARM library's `all` ruleset.

## Suppression

Suppress this rule only when compatibility requirements prevent the standard response envelope or paging metadata, or require preserving a request-only token contract. Keep valid paging annotations; removing `@continuationToken` merely to silence the warning can prevent SDKs from recognizing the actual service contract.

Token diagnostics target the operation. For the default central rulesets, suppress the core variant as described in its documentation. If opting into this combined ARM rule, use the ARM rule ID:

```tsp
#suppress "@azure-tools/typespec-azure-resource-manager/list-response-envelope" "Preserve the published request-token contract; pager resume values are documented separately."
@list
op listWidgets(@query @continuationToken token?: string): {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
};
```

Envelope diagnostics retain their response model/property targets. Review all findings before suppressing the combined rule, since its messages share a rule ID.
