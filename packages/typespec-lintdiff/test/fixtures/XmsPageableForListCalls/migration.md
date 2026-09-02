# XmsPageableForListCalls migration evidence

## Conclusion

The migrated TypeSpec rule required an additional update after promotion review and is now
functionally equivalent to the Swagger `XmsPageableForListCalls` rule over the aligned ARM corpus.
The final run has complete assessable project overlap, no one-sided projects, equal diagnostic
counts, and no deduplicated count outliers. The added fixture also closes the previously untested
child-namespace branch even though that branch did not change the selected corpus counts.

The production rule and directly related fixtures now:

- classify GET paths with the Swagger helper's dotted-provider-tail heuristic;
- diagnose `/operations`, which the Swagger rule treats as a list path;
- ignore response shape because the Swagger rule checks only path and `x-ms-pageable`;
- treat `@list` as pageable only when AutoRest can resolve a next-link property;
- accept an explicitly authored truthy `x-ms-pageable` extension while rejecting falsy values;
- skip dynamic provider paths without a literal dotted namespace; and
- skip non-emitted operation and interface template declarations; and
- recognize emitted operations in child namespaces beneath the ARM provider namespace.

Required changes are complete in:

- `packages/typespec-lintdiff/src/rules/xms-pageable-for-list-calls.ts`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/decorated-custom-list`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/explicit-pageable-extension`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/falsy-pageable-extension`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/list-without-next-link`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/nested-provider-namespace`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/operations-path`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/selector-boundaries`
- `packages/typespec-lintdiff/test/fixtures/XmsPageableForListCalls/rule.md`

## Report inputs

| Source                       | Path                                                                           | Revision / population                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External migration snapshot  | `packages/typespec-lintdiff/docs/coverage_old.md`                              | Added at `6a418911dbe5d35992fb5845cf4460d45643fec8`; 450 compiled projects and 210 validator rules; aggregate-only rule row                                                                              |
| Checked-in LintDiff baseline | `packages/typespec-lintdiff/specs/coverage-breakdown.md` at `HEAD`             | Added at `bf4e84189edc4ebcfcd2fc6ef881e74e3f485ece`; specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462 of 468 projects                                                                        |
| Final local run              | generated corpus artifacts before restoring `packages/typespec-lintdiff/specs` | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; generated `2026-09-02T09:42:24.336Z`; harness revision `67932be3dccc11472cc82f6555dd6d01943d78df` plus this working-tree child-namespace repair |
| Swagger validator            | `azure-openapi-validator` checkout                                             | `6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`                                                                                                                                                               |

The reports use different coverage definitions. The external snapshot credits the number of projects
where the then-current local lint fired. LintDiff requires mapped diagnostics in the same successfully
compiled projects. Neither aggregate baseline can identify individual missing projects; the final
per-project run supplies that evidence.

## Row-level reconciliation

| Report                             | Mode         | Validator projects | TypeSpec projects |      Overlap |      Validator-only |       TypeSpec-only | Validator diagnostics |      TypeSpec diagnostics |
| ---------------------------------- | ------------ | -----------------: | ----------------: | -----------: | ------------------: | ------------------: | --------------------: | ------------------------: |
| `coverage_old.md`                  | not reported |                 75 |     24 local lint | not reported | not reconstructable | not reconstructable |          not reported | lint fired in 24 projects |
| checked-in `coverage-breakdown.md` | production   |                 75 |                24 |           24 |                  51 |                   0 |                   254 |                        43 |
| final assessed run                 | production   |                 75 |                75 |           75 |                   0 |                   0 |                   254 |                       254 |
| unfiltered raw rule shards         | production   |                 77 |                77 |           77 |                   0 |                   0 |                   460 |                       276 |

The 51-project baseline gap was a real semantic implementation gap, not a population change. The
existing rule checked response shape and treated TypeSpec paging metadata as sufficient, while the
Swagger rule checks the emitted path and presence of `x-ms-pageable`. Correcting those semantics
raised observed overlap from 24 to 75 projects.

The difference between the raw and assessed rows is expected. Raw Swagger results include repeated
emitted API-version/file occurrences. The comparison selects the same version projection and excludes
TypeSpec compile failures from both engines.

## Comparable population

- Scope: ARM projects under `specification`, 468 attempted.
- Specs revision: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Swagger source: retained validator results generated with references resolved by AutoRest.
- TypeSpec source: `tsp-lintdiff-local-linter/all` with fixture metadata
  `projectionScope: http-reachable`.
- Successfully compiled projects: 462.
- Failed projects excluded from both sides:
  - `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
  - `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
  - `specification/network/resource-manager/Microsoft.Network/Network/Network`
  - `specification/quota/resource-manager/Microsoft.Quota/Quota`
  - `specification/resources/resource-manager/Microsoft.Resources/deployments`
  - `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Two failed projects contain raw findings for this rule and are removed from both sides:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`

Thus the raw 77-project rule population becomes 75 assessable projects. There are no validator-only,
TypeSpec-only, or unassessed rule projects in the aligned population.

## Diagnostic cardinality

| Identity                                                                     | Swagger validator | TypeSpec lint |
| ---------------------------------------------------------------------------- | ----------------: | ------------: |
| Raw events                                                                   |               460 |           276 |
| Project + Swagger file + JSON path / project + source location               |               420 |           276 |
| Project + JSON path, independent of Swagger file / project + source location |               276 |           276 |
| Aligned version-projected and compile-success population                     |               254 |           254 |

For the file-independent Swagger identity and TypeSpec source identity, all 77 raw projects have
equal counts. There are zero validator-higher projects, zero TypeSpec-higher projects, and zero total
positive or negative differences. After population alignment, all 75 assessable projects still have
equal counts.

The 184 extra raw Swagger events are repeated emitted occurrences across files or API versions.
File-independent operation identity removes that multiplicity. Raw count equality is not generally
required for functional equivalence, but this rule reaches equality once both engines use their
stable operation identities.

## Fixture evidence

| Fixture                       | Expected  | Evidence                                                                                                       |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `compliant-with-template`     | compliant | Standard ARM list templates emit `x-ms-pageable`.                                                              |
| `decorated-custom-list`       | violation | `@armResourceList` satisfies the official ARM operation lint but a non-page response emits no `x-ms-pageable`. |
| `explicit-pageable-extension` | compliant | An explicit OpenAPI extension satisfies both engines.                                                          |
| `falsy-pageable-extension`    | violation | A present but falsy OpenAPI extension fails the validator's truthiness check.                                  |
| `list-without-next-link`      | violation | `@list` plus `@pageItems` without a next link does not cause AutoRest to emit `x-ms-pageable`.                 |
| `list-without-pageable`       | violation | Raw top-level and resource-URI list routes violate; sibling singleton and `/default` routes are ignored.       |
| `nested-provider-namespace`   | violation | An emitted collection GET in a child namespace inherits ARM provider membership and omits `x-ms-pageable`.     |
| `operations-path`             | violation | The Swagger selector and helper classify `/operations` as a list route.                                        |
| `selector-boundaries`         | compliant | A dynamic provider namespace lacks the required dot, and generic templates are not independently emitted.      |

## Emission matrix

The selected OpenAPI field is the GET operation's `x-ms-pageable` value. AutoRest resolves generated
values in `packages/typespec-autorest/src/openapi.ts` through `resolveXmsPageable`; authored
extensions are read from the OpenAPI extension state.

| Authored TypeSpec shape                                  | Emitter/API branch                                | Emitted field   | Swagger      | TypeSpec lint | Fixture                       |
| -------------------------------------------------------- | ------------------------------------------------- | --------------- | ------------ | ------------- | ----------------------------- |
| Standard ARM list template with page items and next link | `isList` + resolved paging output with `nextLink` | truthy object   | clean        | clean         | `compliant-with-template`     |
| Custom `@armResourceList` operation without `@list`      | not an AutoRest list                              | absent          | violation    | violation     | `decorated-custom-list`       |
| `@list` and `@pageItems` without a next link             | paging output has no `nextLink`                   | absent          | violation    | violation     | `list-without-next-link`      |
| Explicit truthy extension                                | authored OpenAPI extension                        | truthy object   | clean        | clean         | `explicit-pageable-extension` |
| Explicit falsy extension                                 | authored OpenAPI extension                        | `null`          | violation    | violation     | `falsy-pageable-extension`    |
| Raw ARM collection GET                                   | no paging metadata                                | absent          | violation    | violation     | `list-without-pageable`       |
| Raw singleton or `/default` GET                          | selector exclusion                                | irrelevant      | clean        | clean         | `list-without-pageable`       |
| Child-namespace ARM collection GET                       | no paging metadata                                | absent          | violation    | violation     | `nested-provider-namespace`   |
| Literal `/operations` GET without paging metadata        | collection-path selector                          | absent          | violation    | violation     | `operations-path`             |
| Dynamic provider namespace with no literal dot           | path helper rejects before extension check        | absent          | clean        | clean         | `selector-boundaries`         |
| Generic operation/interface declaration                  | no independently emitted operation                | no OpenAPI node | not assessed | skipped       | `selector-boundaries`         |

This closes every reachable branch that changes whether the selected field is emitted or accepted.
Response-body families do not add matrix rows because the Swagger implementation never reads the
response and AutoRest's pageable decision depends on paging metadata and next-link presence, not the
ordinary response schema shape.

## Gap examples

### Gap example: falsy extension value

- **Classification:** validator-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/falsy-pageable-extension` / `2024-01-01`
- **Source:** `falsy-pageable-extension/main.tsp`

**TypeSpec source**

```typespec
@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries")
@get
@armResourceList(Widget)
@extension("x-ms-pageable", null)
listSummaries(...): ArmResponse<WidgetSummary> | ErrorResponse;
```

**Emitted OpenAPI**

```json
"/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries": {
  "get": {
    "x-ms-pageable": null
  }
}
```

| Engine            | Observed result                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Swagger validator | Reports because it tests the extension value for truthiness.                      |
| TypeSpec lint     | Reports after the fix; key presence alone previously treated `null` as compliant. |

**Explanation:** The validator accepts a truthy extension object, not merely an authored key.

**Disposition:** Rule fix and regression fixture added after independent review.

### Gap example: response shape is not part of the rule

- **Classification:** validator-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/decorated-custom-list` / `2024-01-01`
- **Source:** `decorated-custom-list/main.tsp`

**TypeSpec source**

```typespec
model WidgetSummary {
  count: int32;
}

@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries")
@get
@armResourceList(Widget)
listSummaries(...): ArmResponse<WidgetSummary> | ErrorResponse;
```

**Emitted OpenAPI**

```json
"/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries": {
  "get": {
    "responses": {
      "200": {
        "schema": { "$ref": "#/definitions/WidgetSummary" }
      }
    }
  }
}
```

| Engine            | Observed result                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports because the collection path has no `x-ms-pageable`; response shape is never inspected.    |
| TypeSpec lint     | Reports after the fix; the previous implementation incorrectly required a `value` array response. |

**Explanation:** The upstream function delegates list classification entirely to the path helper and
then tests only whether the GET operation has `x-ms-pageable`.

**Disposition:** Rule fix.

### Gap example: `/operations` is selected

- **Classification:** validator-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/operations-path` / `2024-01-01`
- **Source:** `operations-path/main.tsp`

**TypeSpec source**

```typespec
@route("/providers/Microsoft.TestService/operations")
@get
@armResourceList(Widget)
list(...ApiVersionParameter): ArmResponse<ProviderOperationSummary> | ErrorResponse;
```

**Emitted OpenAPI**

```json
"/providers/Microsoft.TestService/operations": {
  "get": {
    "operationId": "ProviderOperations_List",
    "responses": {
      "200": {
        "schema": { "$ref": "#/definitions/ProviderOperationSummary" }
      }
    }
  }
}
```

| Engine            | Observed result                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports because the selector excludes only paths ending in `}` or `/default`; the provider tail is collection-shaped. |
| TypeSpec lint     | Reports after removing the prior `/operations` exclusion.                                                             |

**Explanation:** Other ARM rules may special-case the standard Operations API, but this Swagger rule
does not.

**Disposition:** Rule fix.

### Gap example: `@list` without a next link

- **Classification:** validator-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/list-without-next-link` / `2024-01-01`
- **Source:** `list-without-next-link/main.tsp`

**TypeSpec source**

```typespec
model WidgetPageWithoutNextLink {
  @pageItems
  value: Widget[];
}

@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgets")
@get
@list
@armResourceList(Widget)
list(...): ArmResponse<WidgetPageWithoutNextLink> | ErrorResponse;
```

**Emitted OpenAPI**

```json
"/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgets": {
  "get": {
    "responses": {
      "200": {
        "schema": { "$ref": "#/definitions/WidgetPageWithoutNextLink" }
      }
    }
  }
}
```

| Engine            | Observed result                                                                      |
| ----------------- | ------------------------------------------------------------------------------------ |
| Swagger validator | Reports because AutoRest emitted no `x-ms-pageable`.                                 |
| TypeSpec lint     | Reports after requiring `@list`, resolved paging metadata, and a next-link property. |

**Explanation:** `@list` marks an operation as a list but is insufficient for AutoRest's
`x-ms-pageable` emission. The emitter also requires paging output with a next link.

**Disposition:** Rule fix.

### Gap example: literal dotted provider path

- **Classification:** TypeSpec-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/selector-boundaries` / `2024-01-01`
- **Source:** `selector-boundaries/main.tsp`

**TypeSpec source**

```typespec
@route("/subscriptions/{subscriptionId}/providers/{resourceProviderNamespace}/providerPermissions")
@get
@armResourceList(Widget)
providerPermissions(...): ArmResponse<ProviderPermissionListResult> | ErrorResponse;
```

**Emitted OpenAPI**

```json
"/subscriptions/{subscriptionId}/providers/{resourceProviderNamespace}/providerPermissions": {
  "get": {
    "responses": {
      "200": {
        "schema": { "$ref": "#/definitions/ProviderPermissionListResult" }
      }
    }
  }
}
```

| Engine            | Observed result                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Swagger validator | Does not report because `isListOperationPath` first requires the path string to contain `.`. |
| TypeSpec lint     | Does not report after the path guard was made identical.                                     |

**Explanation:** A dynamic provider namespace is semantically ARM-like, but the validator's textual
heuristic cannot classify it. This caused the former TypeSpec-only
`Microsoft.Resources/resources` project.

**Disposition:** Rule fix for strict validator parity.

### Gap example: non-emitted generic templates

- **Classification:** TypeSpec-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/selector-boundaries` / `2024-01-01`
- **Source:** `selector-boundaries/main.tsp`

**TypeSpec source**

```typespec
interface GenericLists<Resource extends TypeSpec.Reflection.Model> {
  @route("/providers/Microsoft.TestService/genericItems")
  @get
  @armResourceList(Resource)
  list<Response extends {}>(...ApiVersionParameter): ArmResponse<Response> | ErrorResponse;
}
```

**Emitted OpenAPI**

```json
{
  "paths": {
    "/subscriptions/{subscriptionId}/providers/{resourceProviderNamespace}/providerPermissions": {
      "get": {}
    }
  }
}
```

| Engine            | Observed result                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Swagger validator | Cannot report the generic declaration because no `genericItems` path is emitted.         |
| TypeSpec lint     | Does not report after skipping operation and containing-interface template declarations. |

**Explanation:** TypeSpec linters can visit reusable generic declarations that have no independent
OpenAPI representation. Diagnosing them created the former TypeSpec-only Marketplace Skus project.

**Disposition:** Rule fix.

### Gap example: child ARM namespaces

- **Classification:** validator-only before fix
- **Status:** fixed
- **Project/API version:** fixture `XmsPageableForListCalls/nested-provider-namespace` / `2024-01-01`
- **Source:** `nested-provider-namespace/main.tsp`

**TypeSpec source**

```typespec
@armProviderNamespace
namespace Microsoft.TestService;

namespace Inventory {
  interface Widgets {
    @route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries")
    @get
    @armResourceList(Widget)
    listSummaries(@path subscriptionId: string, ...ApiVersionParameter):
      | ArmResponse<WidgetSummary>
      | ErrorResponse;
  }
}
```

**Emitted OpenAPI**

```json
"/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries": {
  "get": {
    "operationId": "Widgets_ListSummaries",
    "responses": {
      "200": {
        "schema": { "$ref": "#/definitions/Inventory.WidgetSummary" }
      }
    }
  }
}
```

| Engine            | Observed result                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports because the emitted collection GET omits `x-ms-pageable`; TypeSpec namespace nesting is not represented in the selected path. |
| TypeSpec lint     | Reports after using ancestor-aware ARM provider lookup for the operation's child namespace.                                           |

**Explanation:** The previous TypeSpec implementation passed the operation's immediate namespace to
`resolveProviderNamespace`, which searches that namespace and its descendants for a provider
declaration. It did not walk to an `@armProviderNamespace` ancestor, so emitted operations in child
namespaces were incorrectly skipped. `getArmProviderNamespace` performs the required ancestor lookup.

**Disposition:** Rule fix and regression fixture added after promotion review.

## Final determination

The migrated TypeSpec rule is functionally equal to the related Swagger rule for the pinned,
successfully compiled, version-aligned ARM population. Raw Swagger event counts remain higher only
because the validator observes repeated emitted files and API versions; stable deduplicated
operation identities and the aligned comparison are exact. The child-namespace regression fixture
closes the negative-space gap found during promotion review, while the final full-corpus row remains
75 overlapping projects and 254 aligned diagnostics on each side. No rule-specific uncertainty
remains.
