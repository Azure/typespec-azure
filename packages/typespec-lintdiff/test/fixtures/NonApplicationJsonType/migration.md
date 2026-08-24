# NonApplicationJsonType migration investigation

## Conclusion

The migrated TypeSpec rule
`tsp-lintdiff-local-linter/non-application-json-type` is functionally equivalent
to the Swagger `NonApplicationJsonType` rule for authorable TypeSpec ARM
operations after this change.

**TypeSpec rule update required:** yes. The rule already discovered implicit
scalar response content types, but diagnostics targeted a body property
instantiated from the ARM library. The compiler does not surface project lint
diagnostics on that library target. The rule now uses an authored content-type
or body property when available and otherwise reports on the authored
operation. A scalar-response regression fixture covers the corrected branch.

## Reports and populations

| Evidence                                                              | Revision and population                                                                                                                                                                             | `NonApplicationJsonType` row                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/coverage_old.md`](../../../docs/coverage_old.md)               | Snapshot committed at `6a418911dbe5d35992fb5845cf4460d45643fec8`; source gist does not record its specs or generator revision; 450 compiled projects and 210 validator rules                        | Below 80%: validator fired in 4 projects, local lint fired in 3, no official coverage, 75%                                                                |
| [`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md) | Checked-in baseline generated `2026-08-10T09:38:18.108Z` at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462 of 468 projects compiled successfully                                      | Production: validator 3 projects, TypeSpec 3 projects, overlap 3, no one-sided projects; 20 validator and 19 TypeSpec diagnostics                         |
| Fresh full validation recorded by this note                           | Full `specs:typespec` run generated `2026-08-24T10:31:51.884Z` at the same specs commit with harness revision `fa05821e966c8b326d82e401b5158215490721a9`; 462 of 468 projects compiled successfully | Production: validator 3 projects, raw TypeSpec 4 projects, overlap 3, validator-only 0, raw TypeSpec-only 1; 20 validator and 21 raw TypeSpec diagnostics |

The old report credits aggregate project coverage across a different,
unrecorded snapshot. It does not retain per-project diagnostics, so its fourth
validator project cannot be reconstructed by subtracting the totals. The
checked-in lint-diff report requires observed same-project diagnostics over the
pinned successful-project population and preserves the project sets and raw
results.

The fresh full run is validation evidence for this rule change. As required for
rule-development PRs, its generated files under `specs/` were restored instead
of committed; the complete rule row, project sets, counts, and representative
source evidence are preserved below. It evaluated ARM rules against the
dataset-selected latest Swagger API version. TypeSpec linting observed the
unprojected service, so the raw TypeSpec result also includes declarations
removed from the selected version. The six compile failures were excluded from
both sides:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

None can be assessed for this rule; this is retained uncertainty about the
excluded population, not evidence of a semantic mismatch.

## Aligned project comparison

The selected-latest-version TypeSpec population excludes the Container Apps
diagnostic described below because its operation is removed in the selected
`2026-01-01` service version.

| Project                                                                        | Validator | Raw TypeSpec | Selected-version TypeSpec |
| ------------------------------------------------------------------------------ | --------: | -----------: | ------------------------: |
| `specification/automation/Automation.Management`                               |         8 |            8 |                         8 |
| `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace` |         2 |            2 |                         2 |
| `specification/web/resource-manager/Microsoft.Web/AppService`                  |        10 |           10 |                        10 |
| `specification/app/resource-manager/Microsoft.App/ContainerApps`               |         0 |            1 |                         0 |

Aligned sets:

- Validator projects: Automation, Marketplace, and App Service.
- Selected-version TypeSpec projects: Automation, Marketplace, and App Service.
- Same-project overlap: all 3 projects.
- Validator-only projects: none.
- Selected-version TypeSpec-only projects: none.

## Diagnostic cardinality

| Identity                                         | Swagger | Raw TypeSpec | Selected-version TypeSpec |
| ------------------------------------------------ | ------: | -----------: | ------------------------: |
| Raw diagnostics                                  |      20 |           21 |                        20 |
| Validator `project + Swagger file + JSON path`   |      20 |          N/A |                       N/A |
| Validator `project + JSON path`                  |      20 |          N/A |                       N/A |
| TypeSpec `project + source file + line + column` |     N/A |           21 |                        20 |

All three aligned projects have equal counts. The raw TypeSpec population has a
single positive difference and no validator excess; after latest-version
attribution both positive and negative differences are zero. These identities
remain representation-specific and count equality is supporting evidence, not
the definition of functional equivalence.

## Rule and fixture evidence

The Swagger spectral rule evaluates every root-level and operation-level
`produces` or `consumes` array entry under both `paths` and `x-ms-paths`. Each
entry must contain the `application/json` pattern. The TypeSpec rule evaluates
the resolved request body and every response body for each ARM HTTP operation,
using the HTTP library's content-type resolution. It reports each non-matching
content type on an authored content-type property, authored body property, or
operation.

Focused fixtures establish:

- explicit `application/octet-stream` response: violation;
- implicit scalar `text/plain` response: violation;
- explicit `text/plain` request: violation;
- explicit `application/merge-patch+json` request: violation;
- JSON-only request and response bodies: compliant.

Root-level Swagger `produces` and `consumes` regressions are not separately
authorable because the current OpenAPI2 emitter controls those global arrays.
The operation fixtures cover the authorable semantic source of the emitted
entries.

### Gap example: library-instantiated scalar response target

- **Classification:** count-only
- **Status:** fixed
- **Project/API version:** `specification/automation/Automation.Management` / `2024-10-23`
- **Source:** `AutomationAccount.tsp`, operation `generateUri`

**TypeSpec source**

```typespec
@action("webhooks/generateUri")
generateUri is ArmResourceActionSync<
  AutomationAccount,
  void,
  ArmResponse<string>
>;
```

**Emitted OpenAPI or validator behavior**

```json
"produces": [
  "text/plain",
  "application/json"
]
```

| Engine            | Observed result                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports `produces[0]` because `text/plain` does not contain `application/json`.                                                                                                  |
| TypeSpec lint     | Before the fix, attempted to report on the ARM-library-instantiated body property and emitted no project diagnostic. After the fix, reports on authored operation `generateUri`. |

**Explanation:** HTTP content-type resolution correctly identifies
`text/plain`. The semantic miss was the diagnostic target: template expansion
left the body property in library context, where project lint diagnostics are
not surfaced. `getLocationContext` now preserves authored property targets and
falls back to the authored operation for library-instantiated bodies.

**Disposition:** production rule fix plus
`scalar-response-content-type` regression fixture.

### Gap example: operation removed from selected version

- **Classification:** TypeSpec-only
- **Status:** population mismatch
- **Project/API version:** `specification/app/resource-manager/Microsoft.App/ContainerApps` / `2026-01-01`
- **Source:** `Revision.tsp`, operation `invokeFunctionsHost`

**TypeSpec source**

```typespec
@removed(Versions.v2026_01_01)
@armResourceOperations
interface FunctionsExtension {
  @action("invoke")
  invokeFunctionsHost is FunctionExtensionOps.ActionSync<Revision, void, ArmResponse<string>>;
}
```

**Selected-version metadata**

```json
{
  "apiVersion": "2026-01-01",
  "serviceCount": 1
}
```

| Engine            | Observed result                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic because the removed operation is absent from selected `2026-01-01` Swagger.             |
| TypeSpec lint     | One raw unprojected diagnostic at `Revision.tsp:130`; zero after attribution to the selected version. |

**Explanation:** the ordinary TypeSpec lint run includes declarations from
older service versions, while the retained Swagger corpus contains only the
dataset-selected version. There is no selected-version Swagger operation to
compare.

**Disposition:** exclude this one diagnostic only from the aligned behavioral
population; preserve it in the raw TypeSpec count.

## Final judgment

The focused fixtures cover every authorable request/response content-type
surface, all selected-version validator projects overlap, no aligned one-sided
projects remain, and the only raw TypeSpec-only project is explained by version
projection. The migrated TypeSpec rule is therefore functionally equal to the
related Swagger rule. Raw count equality is not required, though the aligned
counts are equal in this corpus. Remaining uncertainty is limited to the six
projects that did not compile.
