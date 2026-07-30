> **This rule applies to data-plane services only.** It is enabled in the `data-plane` ruleset and
> deliberately disabled in the `resource-manager` ruleset. Management-plane (ARM) APIs use the OData
> spelling of these options by design -- `Azure.ResourceManager` ships `ArmTopParameter` as
> `@query("$top")`, along with `ArmFilterParameter`, `ArmSkipParameter`, and `SkipTokenParameter` --
> so ARM specs are never reported by this rule.

The standard collection query options (`filter`, `orderby`, `skip`, `top`, `maxpagesize`, `select`, and `expand`) come from the OData standard, where they are spelled with a `$` prefix. Data-plane Azure services use the same names, but without the `$`.

See [`collections-query-options-no-dollar-sign`](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections-query-options-no-dollar-sign) in the Azure REST API Guidelines: **DO NOT** prefix any of these query parameter names with "$".

This rule inspects the query parameter's **wire name** -- the value passed to `@query(...)`, or the property name when no explicit name is given -- rather than the TypeSpec identifier. Only the seven standard collection query options are flagged; other `$`-prefixed names are left alone.

Each offending declaration is reported once, at the declaration itself, even when it is spread into many operations. A suppression therefore belongs on the declaration, not on every operation that uses it.

## Impact

- **Area:** API, SDK

`$`-prefixed names require escaping in URLs and in many client languages, and they make a data-plane service look like an OData service when it is not.

#### ❌ Incorrect

An explicit `$`-prefixed wire name:

```tsp
@route("/widgets")
@get
op listWidgets(@query("$filter") filter?: string, @query("$top") top?: int32): Widget[];
```

A property whose name is itself `$`-prefixed:

```tsp
@route("/widgets")
@get
op listWidgets(@query $orderby?: string): Widget[];
```

#### ✅ Correct

```tsp
@route("/widgets")
@get
op listWidgets(@query filter?: string, @query top?: int32, @query orderby?: string): Widget[];
```

Or use the standard query parameters from `Azure.Core`:

```tsp
@route("/widgets")
interface Widgets {
  list is Azure.Core.StandardResourceOperations.ResourceList<
    Widget,
    Azure.Core.Traits.QueryParametersTrait<Azure.Core.StandardListQueryParameters>
  >;
}
```

## Suppression

Existing data-plane services that derive from OData (for example Search, Batch, and the Cosmos DB Table API) have published `$`-prefixed names that cannot be changed without breaking customers. Suppress the rule for those, ideally at the declaration so a single suppression covers every operation that spreads it.

A new data-plane API should not need a suppression.
