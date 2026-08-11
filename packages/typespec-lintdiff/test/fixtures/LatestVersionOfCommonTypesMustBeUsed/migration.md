# LatestVersionOfCommonTypesMustBeUsed migration investigation

## Final conclusion

The updated TypeSpec rule is functionally equivalent to the Swagger validator
at the project-behavior level for the successfully compiled corpus after the
two tools are aligned to the same selected-API population and known validator
version-map false positives are removed.

The final full run used specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397` and successfully compiled 462 of
468 projects. The generated report still shows four validator-only and seven
TypeSpec-only projects, but every one-sided project has a known non-semantic
cause:

- The four validator-only projects use valid v6 common-types files that the
  validator's stale per-file map still incorrectly identifies as latest in v5.
- The seven TypeSpec-only projects report older source version enum members,
  while the retained Swagger contains only a newer selected API version that
  uses v6.

After those population corrections, both sides fire in the same 384 projects:
384 validator projects, 384 TypeSpec projects, 384 overlapping projects, and no
unexplained one-sided projects. Raw diagnostic cardinalities are intentionally
not equal because Swagger reports each emitted `$ref` occurrence while TypeSpec
reports semantic source usages and version selections.

The conclusion is limited to the 462 projects that compiled. Six compile
failures were excluded from both sides of the comparison and remain corpus
uncertainty, although none had a target-rule validator finding recorded as
unassessed.

## Full-run evidence

Generated at `2026-08-11T05:54:31.309Z` by the existing full corpus runner.
Duration: 1,285,491 ms.

| Measure | Swagger validator | TypeSpec |
| --- | ---: | ---: |
| Successfully assessed projects | 462 | 462 |
| Projects with target-rule diagnostics | 388 | 391 |
| Same-project overlap | 384 | 384 |
| One-sided projects | 4 | 7 |
| Raw diagnostics in successful projects | 40,692 | 698 |

The machine-readable occurrence-normalization pilot reports 383 validator
identities and 384 TypeSpec identities (99.7396% consistency). It is not the
equivalence basis for this rule because its identity omits the common-types
filename and its source-line projection cannot reliably associate
reference-level operation diagnostics with one selected API version.

## Complete validator-only project list

| Project | Validator diagnostics | Cause |
| --- | ---: | --- |
| `specification/communication/Communication.Management` | 2 | Emitted `v6/networksecurityperimeter.json`; validator map expects v5. |
| `specification/containerservice/resource-manager/Microsoft.ContainerService/aks` | 1 | Emitted `v6/managedidentitywithdelegation.json`; validator map expects v5. |
| `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB` | 1 | Emitted `v6/networksecurityperimeter.json`; validator map expects v5. |
| `specification/search/resource-manager/Microsoft.Search/Search` | 2 | Emitted `v6/networksecurityperimeter.json`; validator map expects v5. |

The four projects reference two distinct files:
`networksecurityperimeter.json` and
`managedidentitywithdelegation.json`. Valid v6 copies of both files exist under
`specification/common-types/resource-management/v6` at the pinned specs
commit, and their Swagger metadata identifies them as version 6.0.

The published `@microsoft.azure/openapi-validator-rulesets` package does not
discover the latest version from the common-types directory. Its generated
`dist/spectral/functions/utils.js` contains this hard-coded map:

```js
["managedidentitywithdelegation.json", "v5"],
["networksecurityperimeter.json", "v5"],
```

`isLatestCommonTypesVersionForFile` then uses exact string equality between the
referenced version and that map. Consequently, a valid v6 reference does not
equal the stale v5 entry, so the validator reports it and recommends
downgrading to v5. There is no validator command-line option that overrides
this map; correcting it requires a newer or locally patched rulesets package
and regenerated validator results.

The TypeSpec rule instead recognizes v6 as the latest ARM common-types version
and therefore correctly does not report these references. Changing the
TypeSpec rule to reproduce the four validator-only projects would copy stale
validator data and introduce false positives rather than preserve the intended
latest-version behavior.

For a real legacy reference, the diagnostic does not simply ask the user to
select v6 again. It states that the API version already selects v6, identifies
the specific common-type symbol still resolving to an older file, and asks the
user to replace that legacy symbol with a type supported by v6. This distinction
avoids implying that `@armCommonTypesVersion` itself is wrong.

## Complete TypeSpec-only project list

| Project | TypeSpec diagnostics | Selected Swagger API version | Cause |
| --- | ---: | --- | --- |
| `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer` | 4 | `2026-02-06-preview` | Older v5 source version members; selected API uses v6. |
| `specification/devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure` | 1 | `2026-07-03-preview` | Older v5 source version member; selected API uses v6. |
| `specification/dnsresolver/resource-manager/Microsoft.Network/DnsResolver` | 1 | `2025-10-01-preview` | Older v5 source version member; selected API uses v6. |
| `specification/durabletask/resource-manager/Microsoft.DurableTask/DurableTask` | 2 | `2026-05-01-preview` | Older v5 source version members; selected API uses v6. |
| `specification/edge/resource-manager/Microsoft.Edge/edge` | 2 | `2025-06-01` | Older v5 source version members; selected API uses v6. |
| `specification/edge/resource-manager/Microsoft.Edge/sites` | 2 | `2025-06-01` | Older v5 source version members; selected API uses v6. |
| `specification/trafficmanager/resource-manager/Microsoft.Network/TrafficManager` | 1 | `2024-04-01-preview` | Older v3 source version member; selected API uses v6. |

The TypeSpec runner analyzes the unprojected service and therefore visits every
version enum member. The validator shard contains only the selected emitted
Swagger API. Applying the selected-version projection removes all seven
TypeSpec-only projects.

## Former real misses are resolved

The reference-level rule change detects all four projects that previously had
selected Swagger APIs with outdated references but no corresponding TypeSpec
diagnostic:

| Project | Outdated reference | Validator diagnostics | Current TypeSpec evidence |
| --- | --- | ---: | --- |
| `specification/azureresiliencemanagement/resource-manager/Microsoft.AzureResilienceManagement/AzureResilienceManagement` | `v5/types.json` | 1 | Four version-projected reference diagnostics at `main.tsp:51`. |
| `specification/eventgrid/resource-manager/Microsoft.EventGrid/EventGrid` | `v5/types.json` | 4 | Reference diagnostic at `routes.tsp:112`. |
| `specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute` | `v5/types.json` | 2 | Two reference diagnostics at `routes.tsp:54`, in addition to three existing older-version selection diagnostics. |
| `specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise` | `v4/managedidentity.json` | 2 | Four version-projected reference diagnostics at `Cluster.tsp:52`. |

The raw counts differ because one Swagger reference may appear many times and
one TypeSpec source usage may be evaluated in multiple service versions. The
important result is that all four projects now overlap.

## Compile failures

The full run discovered 468 projects, compiled 462, and excluded these six from
validator and TypeSpec comparison counts:

| Project | Compile cause |
| --- | --- |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | Two `@typespec/http/duplicate-body` errors in `client.tsp`. |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups` | Four `@typespec/http/missing-uri-param` errors for route parameters. |
| `specification/network/resource-manager/Microsoft.Network/Network/Network` | One `@typespec/http/missing-uri-param` error. |
| `specification/quota/resource-manager/Microsoft.Quota/Quota` | Two `@typespec/http/missing-uri-param` errors. |
| `specification/resources/resource-manager/Microsoft.Resources/deployments` | One `@typespec/http/duplicate-body` error in the ARM legacy operations template. |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker` | Two `@typespec/http/duplicate-body` errors in `client.tsp`. |

These failures are unrelated to the target rule. They prevent an unconditional
statement about all 468 projects, but they do not introduce a known target-rule
gap in the assessed population.

## Reports reconciled

This investigation reads both:

- `packages/typespec-lintdiff/docs/coverage_old.md`
- `packages/typespec-lintdiff/specs/coverage-breakdown.md`

| Report | Compiled population | Validator fired | TypeSpec fired | Overlap | Validator-only | TypeSpec-only |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Old external snapshot | 450 | 394 | 386 | Not published | Not published | Not published |
| Pre-change pinned-corpus report | 462 of 468 | 388 | 388 | 381 | 7 | 7 |
| Final post-change full run | 462 of 468 | 388 | 391 | 384 | 4 | 7 |
| Population-aligned conclusion | 462 of 468 | 384 | 384 | 384 | 0 | 0 |

The old report does not identify its specs commit or publish per-project sets,
so its aggregate gap cannot be reconstructed or directly compared. The pinned
post-change run provides the final migration evidence.

## Remaining follow-up outside this rule

No unexplained rule-semantic gap remains. Separate infrastructure or validator
follow-up can improve the raw report:

1. Apply selected-API-version projection before calculating TypeSpec project
   sets for this rule.
2. Correct the validator's per-file latest-version map for v6 common-types
   files.
3. Redesign occurrence normalization to include the common-types filename and a
   reliable projected version identity.
4. Fix the six corpus compile failures and rerun to remove the stated
   uncertainty.
