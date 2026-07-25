The standard collection query options (`filter`, `orderby`, `skip`, `top`, `maxpagesize`, `select`, and `expand`) come from the OData standard, where they are spelled with a `$` prefix. Azure services use the same names, but without the `$`.

See [`collections-query-options-no-dollar-sign`](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections-query-options-no-dollar-sign) in the Azure REST API Guidelines: **DO NOT** prefix any of these query parameter names with "$".

This rule inspects the query parameter's **wire name** — the value passed to `@query(...)`, or the property name when no explicit name is given — rather than the TypeSpec identifier. Only the seven standard collection query options are flagged; other `$`-prefixed names are left alone.

Each offending declaration is reported once, at the declaration itself, even when it is spread into many operations. A suppression therefore belongs on the declaration, not on every operation that uses it.

## Impact

- **Area:** API, SDK

`$`-prefixed names require escaping in URLs and in many client languages, and they make an Azure service look like an OData service when it is not.

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

Suppress only for an existing service whose published query parameter names cannot be changed without breaking customers.

This rule is not enabled in the `resource-manager` ruleset: ARM APIs intentionally use the OData spelling of these options (`Azure.ResourceManager.ArmTopParameter`, `ArmFilterParameter`, `ArmSkipParameter`, `SkipTokenParameter`).
