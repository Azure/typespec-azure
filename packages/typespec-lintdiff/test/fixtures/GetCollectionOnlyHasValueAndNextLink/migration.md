# GetCollectionOnlyHasValueAndNextLink migration evidence

## Conclusion

The migrated TypeSpec rule was updated and is now functionally aligned with the Swagger rule for the investigated ARM corpus, except for one remaining validator-only project caused by ARM common-types version behavior rather than a local rule semantic miss.

The production rule needed two changes:

- Match the Swagger function's provider-tail collection path heuristic instead of counting all path segments from the leading slash.
- Skip 200 responses whose emitted Swagger schema is a direct array, because the Swagger rule is bound to `responses.200.schema.properties` and never runs for array schemas.

Required rule and fixture/test changes are complete in:

- `packages/typespec-lintdiff/src/rules/get-collection-only-has-value-and-next-link.ts`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/extension-scope-value-only`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/array-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/direct-array-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/terminal-resource-invalid-response`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/rule.md`

## Report inputs

| Source | Path | Observed revision / population |
| --- | --- | --- |
| External migration coverage snapshot | `packages/typespec-lintdiff/docs/coverage_old.md` | `GetCollectionOnlyHasValueAndNextLink none 60 58 0 96.7`; aggregate-only row, no one-sided project list |
| Checked-in LintDiff coverage report | `packages/typespec-lintdiff/specs/coverage-breakdown.md` | generated `2026-08-10T00:07:07.561Z`; baseline row is 61 validator projects, 60 TypeSpec projects, 58 overlap, 3 validator-only, 2 TypeSpec-only, 290 validator diagnostics, 267 TypeSpec diagnostics |
| Fresh post-fix LintDiff run | generated local corpus artifacts under `packages/typespec-lintdiff/specs/results/**` and refreshed `packages/typespec-lintdiff/specs/coverage-breakdown.md` before restoring generated corpus files from the PR diff | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, TypeSpec generated `2026-08-26T04:04:27.140Z`, 468 projects, 6 compile failures |

The reports use different definitions. The external snapshot credits broad migration disposition at an older snapshot. The local coverage row measures observed same-project diagnostics in successfully compiled projects for mapped TypeSpec diagnostics.

The post-fix coverage row is intentionally recorded here instead of replacing the checked-in
generated corpus baseline. It is reproducible from this branch with:

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-get-collection-only-value-next-link --concurrency 6
mise exec -- pnpm --dir packages\typespec-lintdiff specs:coverage --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-get-collection-only-value-next-link
```

## Row-level reconciliation

| Report | Mode | Validator projects | TypeSpec projects | Overlap | Validator-only | TypeSpec-only | Raw validator diagnostics | Raw TypeSpec diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `coverage_old.md` | not reported | 60 | 58 local lint | not reported | not reconstructable | not reconstructable | not reported | local lint fired 58 projects |
| checked-in `coverage-breakdown.md` baseline | production | 61 assessable | 60 assessable | 58 | 3 | 2 | 290 | 267 |
| fresh post-fix `coverage-breakdown.md` run | production | 61 assessable | 60 assessable | 60 | 1 | 0 | 290 | 275 |
| Raw rule shards | production | 63 all validator projects | 62 all TypeSpec projects | 62 | 1 | 0 | 429 | 290 |

The fresh coverage row excludes projects outside the assessable compiled population and normalizes the report population, so its project and diagnostic totals differ from the raw rule shard totals. Raw diagnostic equality is not expected because Swagger reports emitted OpenAPI occurrences while TypeSpec reports semantic source targets.

## Project-set comparison

Final assessable coverage:

- Same-project overlap: 60 projects.
- Validator-only projects: `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`.
- TypeSpec-only projects: none.
- Compile failures retained outside the assessed population:
  - `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
  - `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
  - `specification/network/resource-manager/Microsoft.Network/Network/Network`
  - `specification/quota/resource-manager/Microsoft.Quota/Quota`
  - `specification/resources/resource-manager/Microsoft.Resources/deployments`
  - `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Raw rule-shard diagnostic identities:

| Identity | Validator | TypeSpec |
| --- | ---: | ---: |
| Raw diagnostics | 429 | 290 |
| Deduplicated diagnostics | 401 by project + Swagger file + JSON path | 211 by project + source file + line + column |

The raw diagnostic comparison has 49 projects with equal raw counts, 12 validator-higher projects
with 151 additional Swagger diagnostics, and 4 TypeSpec-higher projects with 5 additional TypeSpec
diagnostics. After source-location and JSON-path deduplication, 43 projects have equal counts,
18 are validator-higher by 199 total diagnostics, and 4 are TypeSpec-higher by 4 total diagnostics.

The remaining count deltas are expected source-to-emitted multiplicity and identity-domain
differences. Swagger reports emitted OpenAPI occurrences by file and JSON path. TypeSpec reports
semantic operations/source locations, and repeated operations can share the same response source
location. Equal raw or deduplicated counts are therefore supporting evidence only, not the
equivalence criterion.

## Fixture evidence

Focused validation covers six cases:

| Fixture | Expected | Evidence |
| --- | --- | --- |
| `extra-collection-props` | violation | Swagger and TypeSpec both report the extra top-level collection property. |
| `extension-scope-value-only` | violation | Swagger and TypeSpec both report a provider-tail collection path whose response declares only `value`. |
| `only-value-and-nextlink` | compliant | Swagger and TypeSpec both skip a collection response with exactly `value` and `nextLink`. |
| `array-response-body` | compliant | Swagger has no `schema.properties` node for a named array response body; TypeSpec now skips it. |
| `direct-array-response-body` | compliant | Swagger has no `schema.properties` node for a direct `T[]` response body; TypeSpec now skips it. |
| `terminal-resource-invalid-response` | compliant | Swagger and TypeSpec both skip a provider-tail point path whose response would be invalid for a collection. |

## Gap examples

### Gap example: provider-tail path heuristic

- **Classification:** validator-only before fix
- **Status:** fixed
- **Project/API version:** fixture `GetCollectionOnlyHasValueAndNextLink/extension-scope-value-only` / `2024-01-01`
- **Source:** `test/fixtures/GetCollectionOnlyHasValueAndNextLink/extension-scope-value-only/main.tsp`

**TypeSpec source**

```typespec
@route("/scope/providers/Microsoft.TestService/widgets")
@get
listWidgets(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
  WidgetListResult | ErrorResponse;

model WidgetListResult {
  value?: Widget[];
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {
    "/scope/providers/Microsoft.TestService/widgets": {
      "get": {
        "responses": {
          "200": {
            "schema": {
              "$ref": "#/definitions/WidgetListResult"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "WidgetListResult": {
      "properties": {
        "value": { "type": "array" }
      }
    }
  }
}
```

| Engine | Observed result |
| --- | --- |
| Swagger validator | Reports because the path does not end with `}`, `operations`, or `default`, and the provider-tail segment count is collection-shaped. |
| TypeSpec lint | Reports after the fix; the previous whole-path segment count skipped this shape. |

**Explanation:** The upstream function evaluates the path fragment after the final `.` in the provider namespace. Counting the entire TypeSpec route incorrectly skipped extension-style collection paths.

**Disposition:** Rule fix.

### Gap example: non-collection provider-tail path

- **Classification:** TypeSpec false-positive guard
- **Status:** fixed by fixture coverage
- **Project/API version:** fixture `GetCollectionOnlyHasValueAndNextLink/terminal-resource-invalid-response` / `2024-01-01`
- **Source:** `test/fixtures/GetCollectionOnlyHasValueAndNextLink/terminal-resource-invalid-response/main.tsp`

**TypeSpec source**

```typespec
@route("/scope/providers/Microsoft.TestService/widgets/exampleWidget")
@get
getWidget(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
  WidgetValueOnlyResult | ErrorResponse;

model WidgetValueOnlyResult {
  value: Widget[];
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {
    "/scope/providers/Microsoft.TestService/widgets/exampleWidget": {
      "get": {
        "responses": {
          "200": {
            "schema": {
              "$ref": "#/definitions/WidgetValueOnlyResult"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "WidgetValueOnlyResult": {
      "properties": {
        "value": { "type": "array" }
      }
    }
  }
}
```

| Engine | Observed result |
| --- | --- |
| Swagger validator | Does not report because the final provider-tail fragment `TestService/widgets/exampleWidget` has an odd slash segment count, so the upstream function treats it as a point path. |
| TypeSpec lint | Does not report after the fix because the migrated classifier uses the same provider-tail parity check. |

**Explanation:** This response shape would be invalid for a collection GET, but the route is not a
collection path under the Swagger rule's provider-tail heuristic. The fixture protects the changed
false-positive branch separately from the positive extension-scope collection fixture.

**Disposition:** Regression fixture.

### Gap example: direct array response schemas

- **Classification:** TypeSpec-only before fix
- **Status:** fixed
- **Project/API version:** `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/AnalyticsItems` / `2015-05-01`
- **Source:** `typespec/routes.tsp`

**TypeSpec source**

```typespec
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/microsoft.insights/components/{resourceName}/{scopePath}")
@get
list(...): ArmResponse<ApplicationInsightsComponentAnalyticsItem[]>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "schema": {
    "type": "array",
    "items": {
      "$ref": "#/definitions/ApplicationInsightsComponentAnalyticsItem"
    }
  }
}
```

| Engine | Observed result |
| --- | --- |
| Swagger validator | Does not run because the Spectral `given` path is `responses.200.schema.properties`, and direct array schemas have no `properties` object. |
| TypeSpec lint | Skips after the fix by recognizing both direct and named array response bodies. |

**Explanation:** The migrated rule previously inspected the item model behind a direct `T[]` response, which is broader than Swagger's `schema.properties` binding.

**Disposition:** Rule fix.

### Gap example: repeated emitted collection response paths

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `specification/web/resource-manager/Microsoft.Web/AppService` / `2026-07-15`
- **Source:** `typespec/models.tsp`

**TypeSpec source**

```typespec
model MSDeployLog extends ProxyOnlyResource {
  properties?: MSDeployLogProperties;
}

model MSDeployLogProperties {
  @visibility(Lifecycle.Read)
  @identifiers(#[])
  entries?: MSDeployLogEntry[];
}
```

**Emitted OpenAPI or validator behavior**

The same source response target contributes diagnostics for multiple emitted collection paths:

```json
[
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/extensions/MSDeploy/log",
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/instances/{instanceId}/extensions/MSDeploy/log",
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/slots/{slot}/extensions/MSDeploy/log",
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/slots/{slot}/instances/{instanceId}/extensions/MSDeploy/log"
]
```

| Engine | Observed result |
| --- | --- |
| Swagger validator | Reports once for each emitted OpenAPI path's `responses.200.schema.properties`. |
| TypeSpec lint | Reports the semantic response target at `models.tsp:11943`; raw output repeats it for the generated operations, and source-location deduplication collapses those rows to one source identity. |

**Explanation:** This is a count-only identity difference. The Swagger identity is project + file +
JSON path, while the TypeSpec identity is project + source file + line + column. The duplicated
emitted paths do not demonstrate a missing semantic check.

**Disposition:** Intentional count-only difference.

### Gap example: common-types private link list result

- **Classification:** validator-only
- **Status:** intentional remaining gap
- **Project/API version:** `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers` / `2025-12-01-preview`
- **Source:** `typespec/PrivateLinkResource.tsp`

**TypeSpec source**

```typespec
listByServer is ArmResourceListByParent<
  PrivateLinkResource,
  Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResultV5>
>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "$ref": "../../../../../../../../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateLinkResourceListResult"
}
```

The referenced `v5/privatelinks.json` definition contains only a `value` property:

```json
{
  "type": "object",
  "properties": {
    "value": {
      "type": "array"
    }
  }
}
```

| Engine | Observed result |
| --- | --- |
| Swagger validator | Reports against the emitted common-types v5 `PrivateLinkResourceListResult` `properties` object. |
| TypeSpec lint | Does not report in the aligned corpus result. |

**Explanation:** This is isolated to the ARM common-types v5 private-link list envelope used through an external common-types reference. The local rule change intentionally stays focused on authorable response-shape semantics and does not change common-types definitions or external reference handling.

**Disposition:** Remaining uncertainty / external common-types population gap, not a broad rule rewrite.

## Final assessment

The migrated TypeSpec rule now covers the confirmed Swagger semantics for authorable ARM collection GET response object models and no longer reports direct array response bodies that Swagger cannot inspect. The final assessable corpus has 60 overlapping projects, no TypeSpec-only projects, and one validator-only common-types v5 private-link response. The rule is functionally equivalent for migrated authorable TypeSpec service models with the noted common-types v5 uncertainty.
