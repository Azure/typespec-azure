# ParametersInPost migration investigation

## Conclusion

The migrated TypeSpec rule required an update. The Swagger
`ParametersInPost` rule applies to every ARM POST operation, while the former
TypeSpec rule only inspected ARM resource actions. That narrower TypeSpec
scope missed real non-resource ARM POST operations such as Cost Management
forecast/report generation, Data Protection fetch operations, Edge Order list
operations, Management Groups `getEntities`, Monitor metrics, Peering
`lookingGlass`, Policy Insights query results, and Purview
`removeDefaultAccount`.

After broadening the TypeSpec rule to all ARM provider namespaces, the full
corpus run at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`
generated at `2026-08-14T03:04:19.534Z` produced 32 Swagger projects, 32
TypeSpec projects, 32 overlapping projects, and no one-sided projects in the
successfully compiled coverage population. The migrated TypeSpec rule is
therefore functionally equivalent to the related Swagger rule for the assessed
population.

Raw diagnostic equality is not required and is not expected. Swagger reports
emitted OpenAPI occurrences; TypeSpec reports semantic source targets.

## Required TypeSpec changes

1. Change `src/rules/parameters-in-post.ts` to gate on ARM provider namespace
   instead of `getArmResourceOperationData(...).kind === "action"`.
2. Add `non-resource-post-query` as a violating fixture for an ARM POST
   operation that is not a resource action.
3. Keep the existing action-query, multiple-query, and api-version-only
   fixtures as regression coverage.

No emitter, validator, corpus-generator, or comparison-normalization changes
are required.

## Report reconciliation

| Report | Source revision / generation | Population | Row | Projects | TypeSpec projects | Overlap | Gap | TypeSpec-only | Diagnostics |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `docs/coverage_old.md` | external report snapshot checked into this repo | 450 compiled projects, 210 validator rules | `ParametersInPost none 33 25 0 75.8` | 33 | 25 | not listed separately | not reconstructable | not listed | not listed |
| `specs/coverage-breakdown.md` before this fix | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, full run over 462/468 successful projects | 462 successful projects, 215 known validator rules | `ParametersInPost production` | 32 | 24 | 24 | 8 | 0 | 424 Swagger, 167 TypeSpec |
| refreshed full corpus after this fix | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, generated at `2026-08-14T03:04:19.534Z`, full run over 462/468 successful projects | 462 successful projects, 215 known validator rules | `ParametersInPost production` | 32 | 32 | 32 | 0 | 0 | 424 Swagger, 426 TypeSpec |

The old external report and local lint-diff report use different snapshots and
coverage definitions. The old report provides aggregate coverage credit only,
so the exact unmatched project set cannot be reconstructed from it. The local
lint-diff report records same-project diagnostic overlap only, and its
project-level gap was reproducible from the checked-in per-rule shards.
No generator revision is recorded in `coverage_old.md`; the local run records
the specs commit and generated timestamp in `specs/typespec-results.json`.

## Former project gap

Before the TypeSpec rule update, the local checked-in shards showed 34 raw
validator projects and 26 TypeSpec projects. Restricting to successfully
compiled projects gave the coverage row above: 32 validator projects, 24
TypeSpec projects, 24 overlap, and 8 validator-only projects.

The validator-only projects were:

| Project | Representative POST operations / query parameters |
| --- | --- |
| `specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement` | forecast and reservation report POSTs with `$filter`, `startDate`, `endDate` |
| `specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection` | fetch secondary recovery points / cross-region restore jobs with `$filter`, `$skipToken` |
| `specification/edgeorder/resource-manager/Microsoft.EdgeOrder/EdgeOrder` | list/product metadata POSTs with `$expand`, `$skipToken` |
| `specification/management/resource-manager/Microsoft.Management/ManagementGroups` | `getEntities` with OData query parameters and `groupName` |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/MetricsApi` | metrics POST with metric, interval, aggregation, and dimension query parameters |
| `specification/peering/resource-manager/Microsoft.Peering/Peering` | `lookingGlass` with command and source/destination query parameters |
| `specification/policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyTrackedResourcesApi` | query-results POSTs with `$filter`, `$top` |
| `specification/purview/resource-manager/Microsoft.Purview/Purview` | `removeDefaultAccount` with scope query parameters |

These were real semantic misses. They are ARM POST operations that emit Swagger
paths covered by `ParametersInPost`, but they are not modeled as ARM resource
actions, so the former TypeSpec rule skipped them.

## Refreshed full-corpus result

The final behavioral run was full, not partial:

| Measure | Count |
| --- | ---: |
| Source projects | 468 |
| Projects processed | 468 |
| TypeSpec compile failures | 6 |
| Successful coverage population | 462 |
| Swagger projects in successful population | 32 |
| TypeSpec projects in successful population | 32 |
| Same-project overlap | 32 |
| Swagger-only projects | 0 |
| TypeSpec-only projects | 0 |
| Swagger diagnostics in successful population | 424 |
| TypeSpec diagnostics in successful population | 426 |

The six TypeSpec compile failures were:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Two failed projects,
`specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
and `specification/network/resource-manager/Microsoft.Network/Network/Network`,
had both validator and TypeSpec `ParametersInPost` hits in the raw shards. They
are excluded from the assessed population because local coverage compares only
successfully compiled TypeSpec projects.

## Diagnostic cardinality

Over the successful population:

| Identity | Count |
| --- | ---: |
| Swagger raw diagnostics | 424 |
| Swagger project + file + JSON path | 147 |
| Swagger project + JSON path | 147 |
| TypeSpec raw diagnostics | 426 |
| TypeSpec project + source file + line + column | 405 |

Across all raw shards, including failed projects, both sides had 34 projects.
The raw all-shard diagnostic totals were 726 Swagger diagnostics and 476
TypeSpec diagnostics. Those numbers are not the behavioral acceptance
criterion because failed projects are excluded from coverage and Swagger
emitted-occurrence identities do not equal TypeSpec source identities.

All successful projects overlap. The only project-level raw-count skew is
`specification/hybridconnectivity/HybridConnectivity.Management`, where Swagger
has 2 diagnostics and TypeSpec has 4. The TypeSpec diagnostics are duplicate
reports on two source locations for `expiresin`, while Swagger emits two POST
parameter occurrences. This is a source-to-emission cardinality difference, not
a remaining project coverage gap.

## Fixture evidence

Focused fixture validation covers:

| Fixture | Swagger result | TypeSpec result |
| --- | --- | --- |
| `query-param-in-post` | one `mode` violation | one `parameters-in-post` diagnostic |
| `multiple-query-params` | `mode` and `format` violations | matching `mode` and `format` diagnostics |
| `non-resource-post-query` | one `$filter` violation on a non-resource ARM POST | matching `$filter` diagnostic |
| `api-version-only` | no `ParametersInPost` violation | no `parameters-in-post` diagnostic |

The non-resource fixture is the direct regression for the former semantic gap.
The remaining ambient fixture diagnostics are unrelated rule noise and are
recorded in the fixture snapshots.

## Deliberately not copied

The TypeSpec rule does not attempt to reproduce Swagger's emitted-occurrence
duplication or report on JSON-path parameter arrays. It reports the authorable
TypeSpec query parameter target. It also keeps the ARM boundary by requiring an
ARM provider namespace, rather than running over arbitrary data-plane POST
operations.

## Final statement

With aligned successful-project populations, all validator projects are covered
by TypeSpec diagnostics, there are no TypeSpec-only projects, and the focused
fixtures cover the previously missed authorable surface. Remaining raw-count
differences are explained by different diagnostic identity domains. No
unresolved semantic uncertainty remains for `ParametersInPost`.
