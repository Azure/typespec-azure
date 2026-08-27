# GetCollectionOnlyHasValueAndNextLink migration evidence

## Conclusion

The migrated TypeSpec rule was updated and is now functionally aligned with the Swagger rule for the investigated ARM corpus. The final full run has complete assessable project overlap, no validator-only projects, and no TypeSpec-only projects.

The production rule needed eight changes:

- Match the Swagger function's provider-tail collection path heuristic instead of counting all path segments from the leading slash.
- Skip 200 responses whose emitted Swagger schema is a direct array, because the Swagger rule is bound to `responses.200.schema.properties` and never runs for array schemas.
- Skip 200 response models with no declared properties, such as direct `Record<T>` response schemas, because Swagger has no `schema.properties` selector match for those shapes.
- Target the authored operation when the invalid response envelope comes from library code so common-types response envelopes surface diagnostics in service projects.
- Ignore TypeSpec route query suffixes for terminal path-parameter and provider-tail classification, matching emitted OpenAPI path behavior.
- Match the Swagger `endsWith("operations")` and `endsWith("default")` suffix exclusions exactly, not only when those words are standalone path segments.
- Apply `operations` and `default` suffix exclusions to the raw path key before query stripping, matching the Swagger selector order.
- Skip file and multipart 200-response bodies because AutoRest emits `type: file` and `type: string` schemas without the `schema.properties` node selected by Swagger.

Required rule and fixture/test changes are complete in:

- `packages/typespec-lintdiff/src/rules/get-collection-only-has-value-and-next-link.ts`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/extension-scope-value-only`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/array-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/direct-array-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/terminal-resource-invalid-response`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/record-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/file-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/multipart-response-body`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/operations-suffix-invalid-response`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/operations-query-suffix-invalid-response`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/default-suffix-invalid-response`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/default-query-suffix-invalid-response`
- `packages/typespec-lintdiff/test/fixtures/GetCollectionOnlyHasValueAndNextLink/rule.md`

## Report inputs

| Source                               | Path                                                                                                                                                                                                                 | Observed revision / population                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External migration coverage snapshot | `packages/typespec-lintdiff/docs/coverage_old.md`                                                                                                                                                                    | `GetCollectionOnlyHasValueAndNextLink none 60 58 0 96.7`; aggregate-only row, no one-sided project list                                                                                               |
| Checked-in LintDiff coverage report  | `packages/typespec-lintdiff/specs/coverage-breakdown.md`                                                                                                                                                             | generated `2026-08-10T09:38:18.108Z`; baseline row is 61 validator projects, 60 TypeSpec projects, 58 overlap, 3 validator-only, 2 TypeSpec-only, 290 validator diagnostics, 267 TypeSpec diagnostics |
| Final post-fix LintDiff run          | generated local corpus artifacts under `packages/typespec-lintdiff/specs/results/**` and refreshed `packages/typespec-lintdiff/specs/coverage-breakdown.md` before restoring generated corpus files from the PR diff | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, TypeSpec generated `2026-08-27T05:12:41.669Z`, 468 projects, 6 compile failures                                                              |

The reports use different definitions. The external snapshot credits broad migration disposition at an older snapshot. The local coverage row measures observed same-project diagnostics in successfully compiled projects for mapped TypeSpec diagnostics.

The final post-fix coverage row is intentionally recorded here instead of replacing the checked-in
generated corpus baseline. It is reproducible from this branch with:

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-get-collection-only-value-next-link --concurrency 6
mise exec -- pnpm --dir packages\typespec-lintdiff specs:coverage --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-get-collection-only-value-next-link
```

## Row-level reconciliation

| Report                                      | Mode         |        Validator projects |        TypeSpec projects |      Overlap |      Validator-only |       TypeSpec-only | Raw validator diagnostics |     Raw TypeSpec diagnostics |
| ------------------------------------------- | ------------ | ------------------------: | -----------------------: | -----------: | ------------------: | ------------------: | ------------------------: | ---------------------------: |
| `coverage_old.md`                           | not reported |                        60 |            58 local lint | not reported | not reconstructable | not reconstructable |              not reported | local lint fired 58 projects |
| checked-in `coverage-breakdown.md` baseline | production   |             61 assessable |            60 assessable |           58 |                   3 |                   2 |                       290 |                          267 |
| final post-fix `coverage-breakdown.md` run  | production   |             61 assessable |            61 assessable |           61 |                   0 |                   0 |                       290 |                          290 |
| Raw rule shards                             | production   | 63 all validator projects | 63 all TypeSpec projects |           63 |                   0 |                   0 |                       429 |                          305 |

The final coverage row excludes projects outside the assessable compiled population and normalizes the report population, so its project and diagnostic totals differ from the raw rule shard totals. Raw diagnostic equality is not expected because Swagger reports emitted OpenAPI occurrences while TypeSpec reports semantic source targets.

## Project-set comparison

Final assessable coverage:

- Same-project overlap: 61 assessable projects.
- Validator-only projects: none.
- TypeSpec-only projects: none.
- Compile failures retained outside the assessed population:
  - `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
  - `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
  - `specification/network/resource-manager/Microsoft.Network/Network/Network`
  - `specification/quota/resource-manager/Microsoft.Quota/Quota`
  - `specification/resources/resource-manager/Microsoft.Resources/deployments`
  - `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Raw rule-shard diagnostic identities:

| Identity                 |                                 Validator |                                     TypeSpec |
| ------------------------ | ----------------------------------------: | -------------------------------------------: |
| Raw diagnostics          |                                       429 |                                          305 |
| Deduplicated diagnostics | 401 by project + Swagger file + JSON path | 226 by project + source file + line + column |

The raw diagnostic comparison has 62 projects with equal raw counts, one validator-higher project
with 124 additional Swagger diagnostics, and no TypeSpec-higher projects. After source-location and
JSON-path deduplication, 50 projects have equal counts, 13 are validator-higher by 175 total
diagnostics, and none are TypeSpec-higher.

The remaining count deltas are expected source-to-emitted multiplicity and identity-domain
differences. Swagger reports emitted OpenAPI occurrences by file and JSON path. TypeSpec reports
semantic operations/source locations, and repeated operations can share the same response source
location. Equal raw or deduplicated counts are therefore supporting evidence only, not the
equivalence criterion.

## Fixture evidence

Focused validation covers thirteen cases:

| Fixture                                    | Expected  | Evidence                                                                                                                            |
| ------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `extra-collection-props`                   | violation | Swagger and TypeSpec both report the extra top-level collection property.                                                           |
| `extension-scope-value-only`               | violation | Swagger and TypeSpec both report a provider-tail collection path whose response declares only `value`.                              |
| `only-value-and-nextlink`                  | compliant | Swagger and TypeSpec both skip a collection response with exactly `value` and `nextLink`.                                           |
| `array-response-body`                      | compliant | Swagger has no `schema.properties` node for a named array response body; TypeSpec now skips it.                                     |
| `direct-array-response-body`               | compliant | Swagger has no `schema.properties` node for a direct `T[]` response body; TypeSpec now skips it.                                    |
| `record-response-body`                     | compliant | Swagger has no `schema.properties` node for a direct `Record<T>` object body; TypeSpec now skips it.                                |
| `file-response-body`                       | compliant | Swagger emits `type: file` without a `schema.properties` node; TypeSpec now skips it.                                               |
| `multipart-response-body`                  | compliant | Swagger emits `type: string` without a `schema.properties` node; TypeSpec now skips it.                                             |
| `terminal-resource-invalid-response`       | compliant | Swagger and TypeSpec both skip a provider-tail point path with a query suffix whose response would be invalid for a collection.     |
| `operations-suffix-invalid-response`       | compliant | Swagger and TypeSpec both skip a collection-shaped path that ends with `operations`.                                                |
| `operations-query-suffix-invalid-response` | violation | Swagger and TypeSpec both report a collection-shaped path whose raw key no longer ends with `operations` because of a query suffix. |
| `default-suffix-invalid-response`          | compliant | Swagger and TypeSpec both skip a collection-shaped path that ends with `default`.                                                   |
| `default-query-suffix-invalid-response`    | violation | Swagger and TypeSpec both report a collection-shaped path whose raw key no longer ends with `default` because of a query suffix.    |

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

| Engine            | Observed result                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports because the path does not end with `}`, `operations`, or `default`, and the provider-tail segment count is collection-shaped. |
| TypeSpec lint     | Reports after the fix; the previous whole-path segment count skipped this shape.                                                      |

**Explanation:** The upstream function evaluates the path fragment after the final `.` in the provider namespace. Counting the entire TypeSpec route incorrectly skipped extension-style collection paths.

**Disposition:** Rule fix.

### Gap example: non-collection provider-tail path

- **Classification:** TypeSpec false-positive guard
- **Status:** fixed by fixture coverage
- **Project/API version:** fixture `GetCollectionOnlyHasValueAndNextLink/terminal-resource-invalid-response` / `2024-01-01`
- **Source:** `test/fixtures/GetCollectionOnlyHasValueAndNextLink/terminal-resource-invalid-response/main.tsp`

**TypeSpec source**

```typespec
@route("/scope/providers/Microsoft.TestService/widgets/exampleWidget?disambiguation_dummy")
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
  "x-ms-paths": {
    "/scope/providers/Microsoft.TestService/widgets/exampleWidget?disambiguation_dummy": {
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

| Engine            | Observed result                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Does not report because the final provider-tail fragment `TestService/widgets/exampleWidget?disambiguation_dummy` becomes a non-collection point path once emitted and selected like OpenAPI. |
| TypeSpec lint     | Does not report after the fix because the migrated classifier ignores the query suffix and then uses the same provider-tail parity check.                                                     |

**Explanation:** This response shape would be invalid for a collection GET, but the route is not a
collection path under the Swagger rule's provider-tail heuristic. The query suffix reproduces the
`RoleDefinitions` corpus shape where the TypeSpec route contains `?disambiguation_dummy` but the
emitted OpenAPI path comparison should still be based on the path portion. The fixture protects the
changed false-positive branch separately from the positive extension-scope collection fixture.

**Disposition:** Regression fixture.

### Gap example: operations/default suffix exclusion

- **Classification:** TypeSpec false-positive guard
- **Status:** fixed by fixture coverage
- **Project/API version:** fixture `GetCollectionOnlyHasValueAndNextLink/operations-suffix-invalid-response` / `2024-01-01`
- **Source:** `test/fixtures/GetCollectionOnlyHasValueAndNextLink/operations-suffix-invalid-response/main.tsp`

**TypeSpec source**

```typespec
@route("/scope/providers/Microsoft.TestService/customoperations")
@get
getCustomOperations(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
  WidgetValueOnlyResult | ErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {
    "/scope/providers/Microsoft.TestService/customoperations": {
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
  }
}
```

| Engine            | Observed result                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | Does not report because the path property string ends with `operations`, and the Swagger selector uses `@property.endsWith('operations')`. |
| TypeSpec lint     | Does not report after the fix because the migrated classifier applies the same suffix test to the raw path key.                            |

**Explanation:** The Swagger rule does not require `/operations` to be a standalone segment. Matching
that exact suffix behavior avoids over-reporting synthetic or unusual paths such as
`customoperations`.

The `default-suffix-invalid-response` fixture independently covers the parallel
`endsWith("default")` branch with `/customdefault`.

**Disposition:** Regression fixtures.

### Gap example: operations/default suffix with query suffix

- **Classification:** TypeSpec false-negative guard
- **Status:** fixed by fixture coverage
- **Project/API version:** fixture `GetCollectionOnlyHasValueAndNextLink/operations-query-suffix-invalid-response` / `2024-01-01`
- **Source:** `test/fixtures/GetCollectionOnlyHasValueAndNextLink/operations-query-suffix-invalid-response/main.tsp`

**TypeSpec source**

```typespec
@route("/scope/providers/Microsoft.TestService/customoperations?disambiguation_dummy")
@get
getCustomOperations(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
  WidgetValueOnlyResult | ErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "x-ms-paths": {
    "/scope/providers/Microsoft.TestService/customoperations?disambiguation_dummy": {
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
  }
}
```

| Engine            | Observed result                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports because the raw path key ends with `?disambiguation_dummy`, not `operations`, and the response model has only `value`.                                                         |
| TypeSpec lint     | Reports after the fix because only terminal path-parameter and provider-tail parity checks use the query-stripped path; `operations`/`default` suffix exclusions use the raw path key. |

**Explanation:** Query stripping is needed for terminal path-parameter and provider-tail parity
classification, but applying it before the Swagger selector's `operations` and `default` suffix
exclusions would suppress paths that the Swagger rule still validates.

The `default-query-suffix-invalid-response` fixture independently confirms that
`/customdefault?disambiguation_dummy` remains in scope because the raw key no longer ends in
`default`.

**Disposition:** Regression fixtures.

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

| Engine            | Observed result                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | Does not run because the Spectral `given` path is `responses.200.schema.properties`, and direct array schemas have no `properties` object. |
| TypeSpec lint     | Skips after the fix by recognizing both direct and named array response bodies.                                                            |

**Explanation:** The migrated rule previously inspected the item model behind a direct `T[]` response, which is broader than Swagger's `schema.properties` binding.

**Disposition:** Rule fix.

### Gap example: property-less object response schemas

- **Classification:** TypeSpec-only before fix
- **Status:** fixed
- **Project/API version:** fixture `GetCollectionOnlyHasValueAndNextLink/record-response-body` / `2024-01-01`
- **Source:** `test/fixtures/GetCollectionOnlyHasValueAndNextLink/record-response-body/main.tsp`

**TypeSpec source**

```typespec
@route("/scope/providers/Microsoft.TestService/widgetMetadata")
@get
listWidgetMetadata(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
  Record<string> | ErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "schema": {
    "type": "object",
    "additionalProperties": {
      "type": "string"
    }
  }
}
```

| Engine            | Observed result                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Does not run because the Spectral `given` path is `responses.200.schema.properties`, and this object schema has no `properties` object. |
| TypeSpec lint     | Skips after the fix by requiring a non-empty semantic property map before validating collection-envelope keys.                          |

**Explanation:** A direct `Record<T>` response emits an object schema but does not expose the
`schema.properties` node selected by the Swagger rule. Treating the empty TypeSpec property map as a
violation was broader than Swagger.

**Disposition:** Rule fix.

### Gap example: file and multipart response schemas

- **Classification:** TypeSpec false-positive guard
- **Status:** fixed by fixture coverage
- **Project/API version:** fixtures `GetCollectionOnlyHasValueAndNextLink/file-response-body` and
  `GetCollectionOnlyHasValueAndNextLink/multipart-response-body` / `2024-01-01`
- **Source:** corresponding fixture `main.tsp` files

**TypeSpec source**

```typespec
@get
downloadWidgetFiles(...): Http.File | ErrorResponse;

@get
downloadWidgetArchives(...): {
  @multipartBody fields: {
    archive: HttpPart<Http.File>;
    description: HttpPart<string>;
  };
} | ErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "fileResponse": { "schema": { "type": "file" } },
  "multipartResponse": { "schema": { "type": "string" } }
}
```

| Engine            | Observed result                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Does not run because neither emitted schema has the `responses.200.schema.properties` node selected by the Spectral rule. |
| TypeSpec lint     | Skips after the fix by requiring the HTTP response body kind to be `single` before examining semantic model properties.   |

**Explanation:** `Http.File` and multipart payloads are represented by TypeSpec models that can
have semantic properties, but AutoRest deliberately lowers them to non-object OpenAPI 2 schemas.
Inspecting those model properties therefore made the migrated rule broader than its Swagger source.

**Disposition:** Rule fix with compliant file and multipart regression fixtures.

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

| Engine            | Observed result                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports once for each emitted OpenAPI path's `responses.200.schema.properties`.                                                                                                                |
| TypeSpec lint     | Reports the semantic response target at `models.tsp:11943`; raw output repeats it for the generated operations, and source-location deduplication collapses those rows to one source identity. |

**Explanation:** This is a count-only identity difference. The Swagger identity is project + file +
JSON path, while the TypeSpec identity is project + source file + line + column. The duplicated
emitted paths do not demonstrate a missing semantic check.

**Disposition:** Intentional count-only difference.

### Gap example: common-types private link list result

- **Classification:** validator-only
- **Status:** fixed
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

| Engine            | Observed result                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports against the emitted common-types v5 `PrivateLinkResourceListResult` `properties` object.                                                                |
| TypeSpec lint     | Reports after the fix at the authored `listByServer` operation (`PrivateLinkResource.tsp:42`) because the invalid common-types model itself is library-defined. |

**Explanation:** The invalid response envelope is represented in the semantic program, but its
declaration is in library/common-types source. Reporting directly on that library model does not
surface as a project diagnostic for the service. The rule now falls back to the authored operation
when the invalid model or property target is not in project source.

**Disposition:** Rule fix verified by the final corpus run.

## Final assessment

The migrated TypeSpec rule now covers the confirmed Swagger semantics for ARM collection GET response object models, including library-defined common-types envelopes, and no longer reports direct array, property-less object, file, multipart, query-suffixed point-path, or `operations`/`default` suffix shapes that Swagger cannot inspect as collection response `schema.properties`. The final assessable corpus has 61 overlapping projects, no validator-only projects, and no TypeSpec-only projects. The rule is functionally equivalent for the investigated corpus; remaining raw count differences are emitted-path/source-location cardinality differences, not behavioral gaps.
