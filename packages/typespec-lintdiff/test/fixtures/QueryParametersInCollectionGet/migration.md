# QueryParametersInCollectionGet migration

## Conclusion

The migrated TypeSpec rule required an update and is now functionally equivalent to the Swagger rule over the assessed corpus. It checks every ARM GET whose emitted path has collection shape, preserves the Swagger rule's case-sensitive exemptions for exactly `api-version` and `$filter`, reports library-provided query parameters on the local operation, and deduplicates repeated semantic visits by resolved ARM provider identity, emitted path, and parameter name.

Across all 468 source projects, both implementations report 2,125 diagnostics in the same 126 projects. After excluding the six TypeSpec compile failures from both sides, the aligned population contains 2,034 diagnostics in the same 122 projects. Raw equality is supporting evidence, not the equivalence criterion: Swagger reports emitted OpenAPI occurrences while TypeSpec reports semantic operations.

## Required changes

- Replace the ARM-operation-kind selector with the Swagger rule's collection-path selector.
- Compare allowed query parameter names case-sensitively.
- Retarget diagnostics for library-declared parameters to the local operation.
- Restrict diagnostics to ARM provider namespaces.
- Deduplicate diagnostics by resolved ARM provider identity, HTTP path, and parameter name.
- Add violating fixtures for raw collection GETs, mis-cased `$FILTER`, and library-provided list parameters.
- Add a compliant non-GET collection-path fixture.

## Report reconciliation

| Report                                                                                     | Population and definition                                                                                                                      | Validator projects | TypeSpec projects |       Overlap |      Validator only |       TypeSpec only | Raw diagnostics                  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -----------------: | ----------------: | ------------: | ------------------: | ------------------: | -------------------------------- |
| [`docs/coverage_old.md`](../../../docs/coverage_old.md)                                    | External snapshot; 450 compiled projects; migration credit rather than strict same-project overlap                                             |                119 |                88 | Not available | Not reconstructable | Not reconstructable | Not reported                     |
| [`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md), checked-in baseline | Commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462/468 successful projects; production validator mode                                      |                  0 |                93 |             0 |                   0 |                  93 | 0 validator / 1,439 TypeSpec     |
| Final aligned staging analysis                                                             | Same commit; 462/468 successful projects; explicitly enabled `stagingOnly` Swagger rule; both sides selected to the latest Swagger API version |                122 |               122 |           122 |                   0 |                   0 | 2,034 validator / 2,034 TypeSpec |

The baseline production row is zero because the Swagger rule is marked `stagingOnly`; it is not evidence that the rule never fires. The older report used a different 450-project snapshot and coverage definition and provides aggregate counts only, so its missing projects cannot be reconstructed.

## Project-set comparison

The final full TypeSpec corpus run completed on 2026-08-26 against specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` and local linter commit `8749413574dd33905da6000273a9c62f89a05755`, which contains the provider-identity deduplication repair. The tested source fingerprint is `sha256:151352c7ce9ae14e1f0c5860bddcb7b9b63dcbcdd01e6e8fdf91b867da3c496b`. Of 468 source projects, 462 compiled successfully and form the aligned behavioral population. [`corpus-evidence.json`](./corpus-evidence.json) retains the exact commands, timestamps, source state, linter fingerprint, full and aligned counts, failed projects, and complete aligned project set.

- Validator projects: 122
- TypeSpec projects: 122
- Same-project overlap: 122
- Validator-only projects: none
- TypeSpec-only projects: none

The selected-version analysis projects the TypeSpec service with the same versioning mutator used by the emitter before collecting collection-query targets. This removes declarations unavailable in the selected Swagger version rather than inferring availability from source locations.

## Diagnostic cardinality

| Identity                                       | Validator | TypeSpec |
| ---------------------------------------------- | --------: | -------: |
| Raw diagnostics in successful projects         |     2,034 |    2,034 |
| Validator project + Swagger file + JSON path   |       830 |      N/A |
| Validator project + JSON path                  |       830 |      N/A |
| TypeSpec project + source file + line + column |       N/A |    1,890 |

All 122 aligned projects have equal raw counts after selected-version projection and ARM-provider-aware deduplication. The full, unfiltered shards contain 2,125 diagnostics across 126 projects on each side; four affected projects are among the six TypeSpec compile failures and are therefore excluded from the behavioral comparison. The deduplicated totals remain different because Swagger JSON paths and TypeSpec source locations are distinct identity domains and are intentionally not treated as interchangeable.

### Gap example: declarations removed from the selected API version

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts` / `2025-10-03-preview`
- **Source:** `typespec/healthmodels/healthmodels.tsp`

**TypeSpec source**

```typespec
@armResourceOperations(SignalDefinition)
@removed(Versions.v2025_10_03)
interface SignalDefinitions {
  listByHealthModel is ArmResourceListByParent<
    SignalDefinition,
    Azure.ResourceManager.Foundations.BaseParameters<SignalDefinition> & TimestampQueryParam
  >;
}

alias TimestampQueryParam = {
  @query
  timestamp?: utcDateTime;
};
```

**Selected-version metadata**

```typespec
@doc("API Version 2025-10-03-preview")
v2025_10_03: "2025-10-03-preview",
```

| Engine            | Observed result                                                          |
| ----------------- | ------------------------------------------------------------------------ |
| Swagger validator | No diagnostic; the removed interface is absent from the selected output. |
| TypeSpec lint     | No diagnostic after applying the selected version's mutator.             |

**Explanation:** The unprojected TypeSpec program previously retained four `timestamp` diagnostics from interfaces removed at `Versions.v2025_10_03`. Projecting the service to `2025-10-03-preview` removes those operations before collection-query targets are matched.

**Disposition:** The comparison harness now projects collection-query targets to the selected Swagger API version.

## Compile failures

Six projects failed TypeSpec compilation and were excluded from both sides of the behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Their exclusion leaves uncertainty only for those uncompiled projects; it does not create a known one-sided result in the assessed population.

## Fixture evidence

Six violating fixtures cover one and multiple direct parameters, raw collection-shaped GETs, nested ARM provider namespaces, case-sensitive allowed names, and parameters inherited from library models. Three compliant fixtures cover exact `api-version`/`$filter` exemptions, point GETs, and non-GET operations. A focused unit regression verifies that deduplication keys use the resolved ARM provider namespace rather than a child namespace. The focused comparison reports no unresolved gaps.

The final evidence supports functional equivalence for all successfully compiled projects at the selected latest Swagger API version. Raw counts happen to be equal, but equality is not required because the deduplicated identity domains differ.
