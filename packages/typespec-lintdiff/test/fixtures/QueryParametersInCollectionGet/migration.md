# QueryParametersInCollectionGet migration

## Conclusion

The migrated TypeSpec rule required an update and is now functionally equivalent to the Swagger rule over the assessed corpus. It checks every ARM GET whose emitted path has collection shape, preserves the Swagger rule's case-sensitive exemptions for exactly `api-version` and `$filter`, reports library-provided query parameters on the local operation, and deduplicates repeated semantic visits by service namespace, emitted path, and parameter name.

After projecting TypeSpec to each project's selected Swagger API version, both implementations report exactly 2,125 diagnostics across the same 126 projects. Raw equality is supporting evidence, not the equivalence criterion: Swagger reports emitted OpenAPI occurrences while TypeSpec reports semantic operations.

## Required changes

- Replace the ARM-operation-kind selector with the Swagger rule's collection-path selector.
- Compare allowed query parameter names case-sensitively.
- Retarget diagnostics for library-declared parameters to the local operation.
- Restrict diagnostics to ARM provider namespaces.
- Deduplicate diagnostics by service namespace, HTTP path, and parameter name.
- Add violating fixtures for raw collection GETs, mis-cased `$FILTER`, and library-provided list parameters.
- Add a compliant non-GET collection-path fixture.

## Report reconciliation

| Report                                                                                     | Population and definition                                                                                                                      | Validator projects | TypeSpec projects |       Overlap |      Validator only |       TypeSpec only | Raw diagnostics                  |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -----------------: | ----------------: | ------------: | ------------------: | ------------------: | -------------------------------- |
| [`docs/coverage_old.md`](../../../docs/coverage_old.md)                                    | External snapshot; 450 compiled projects; migration credit rather than strict same-project overlap                                             |                119 |                88 | Not available | Not reconstructable | Not reconstructable | Not reported                     |
| [`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md), checked-in baseline | Commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462/468 successful projects; production validator mode                                      |                  0 |                93 |             0 |                   0 |                  93 | 0 validator / 1,439 TypeSpec     |
| Final aligned staging analysis                                                             | Same commit; 462/468 successful projects; explicitly enabled `stagingOnly` Swagger rule; both sides selected to the latest Swagger API version |                126 |               126 |           126 |                   0 |                   0 | 2,125 validator / 2,125 TypeSpec |

The baseline production row is zero because the Swagger rule is marked `stagingOnly`; it is not evidence that the rule never fires. The older report used a different 450-project snapshot and coverage definition and provides aggregate counts only, so its missing projects cannot be reconstructed.

## Project-set comparison

The full TypeSpec corpus run completed on 2026-08-25 against specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`. Of 468 source projects, 462 compiled successfully and form the aligned behavioral population.

- Validator projects: 126
- TypeSpec projects: 126
- Same-project overlap: 126
- Validator-only projects: none
- TypeSpec-only projects: none

The selected-version analysis projects the TypeSpec service with the same versioning mutator used by the emitter before collecting collection-query targets. This removes declarations unavailable in the selected Swagger version rather than inferring availability from source locations.

## Diagnostic cardinality

| Identity                                       | Validator | TypeSpec |
| ---------------------------------------------- | --------: | -------: |
| Raw diagnostics in successful projects         |     2,125 |    2,125 |
| Validator project + Swagger file + JSON path   |       874 |      N/A |
| Validator project + JSON path                  |       874 |      N/A |
| TypeSpec project + source file + line + column |       N/A |    1,981 |

All 126 projects have equal raw counts after selected-version projection and service-aware deduplication. The deduplicated totals remain different because Swagger JSON paths and TypeSpec source locations are distinct identity domains and are intentionally not treated as interchangeable.

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

Five violating fixtures cover one and multiple direct parameters, raw collection-shaped GETs, case-sensitive allowed names, and parameters inherited from library models. Three compliant fixtures cover exact `api-version`/`$filter` exemptions, point GETs, and non-GET operations. The focused comparison reports no unresolved gaps.

The final evidence supports functional equivalence for all successfully compiled projects at the selected latest Swagger API version. Raw counts happen to be equal, but equality is not required because the deduplicated identity domains differ.
