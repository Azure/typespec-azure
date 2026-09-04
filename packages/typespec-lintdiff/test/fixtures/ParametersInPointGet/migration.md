# ParametersInPointGet migration investigation

## Conclusion

No production TypeSpec rule change is required. The mapped
`valid-query-parameters-for-point-operations` rule reports every assessable
project reported by Swagger `ParametersInPointGet`, and the focused fixture
confirms that both engines reject an authorable point GET query parameter.

The current full-corpus result is 40 Swagger projects, 62 TypeSpec projects,
40 overlapping projects, no Swagger-only projects, no unassessed projects, and
22 TypeSpec-only projects. The TypeSpec-only projects do not represent false
positives: the TypeSpec rule intentionally also covers PUT, PATCH, and DELETE,
matching the broader staging-only Swagger
`ValidQueryParametersForPointOperations` rule. That aligned staging comparison
has 62 Swagger projects, 62 TypeSpec projects, and no one-sided projects.

## TypeSpec rule-change answer

No TypeSpec rule update is required for `ParametersInPointGet`.

Required production rule and fixture/test changes: none. The only rule-specific
change is this migration note and the fixture `rule.md` link that explain why
the existing broader TypeSpec rule is the correct mapping for this GET-only
Swagger rule.

## Report reconciliation

The older external report records 38 Swagger projects and 37 TypeSpec projects
for `ParametersInPointGet` (97.4% coverage). It is a different corpus snapshot
and provides only aggregate counts, so the historical one-project difference
cannot be reconstructed from that report.

The checked-in lint-diff report uses azure-rest-api-specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`. A full TypeSpec analysis was
rerun on 2026-09-04 over all 468 discovered ARM projects, with 462 successfully
compiled projects included in comparison counts. It records:

| Measure              | Swagger | TypeSpec |
| -------------------- | ------: | -------: |
| Projects             |      40 |       62 |
| Diagnostics          |     189 |      724 |
| Same-project overlap |      40 |       40 |
| One-sided projects   |       0 |       22 |

All 40 Swagger projects are assessable and overlap the TypeSpec result. The
newer 40/40 observation supersedes the older aggregate 38/37 result for this
pinned population; it is not evidence that raw diagnostic counts should be
equal.

The comparable TypeSpec population is the selected-latest-version population
produced by the existing `valid-query-parameters-for-point-operations`
projection filter, shared with the staging
`ValidQueryParametersForPointOperations` analysis. No remaining
`ParametersInPointGet` validator project is hidden by an older-version-only
TypeSpec diagnostic. The raw 62-project TypeSpec set is retained separately
because it contains latest-version PUT, PATCH, and DELETE point-operation
diagnostics that belong to the broader staging Swagger rule, not to the
GET-only production rule.

## TypeSpec-only projects

The 22 TypeSpec-only projects are:

- `specification/appcomplianceautomation/AppComplianceAutomation.Management`
- `specification/azure-kusto/resource-manager/Microsoft.Kusto/Kusto`
- `specification/compute/resource-manager/Microsoft.Compute/Bulkactions`
- `specification/computebulkactions/ComputeBulkActions.Management`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aks`
- `specification/databricks/resource-manager/Microsoft.Databricks/Databricks`
- `specification/desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`
- `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`
- `specification/edge/resource-manager/Microsoft.Edge/configurationmanager`
- `specification/elasticsan/resource-manager/Microsoft.ElasticSan/ElasticSan`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/extensions`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/DataCollectionApi`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/newrelic/NewRelicObservability.Management`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/recoveryservicesdatareplication/resource-manager/Microsoft.DataReplication/DataReplication`
- `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks`
- `specification/scvmm/ScVmm.Management`
- `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`

These projects are one-sided only in the comparison with the GET-only
production rule. The broader staging-rule comparison proves that the same
62-project TypeSpec set matches Swagger behavior across point GET, PUT, PATCH,
and DELETE operations at the selected latest Swagger API versions. They are not
older-version-only diagnostics and they are not TypeSpec false positives for the
broader migrated rule.

### Gap example: broader point-operation verb coverage

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:**
  `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache` /
  selected latest corpus version
- **Source:** `StorageTarget.tsp`, `delete` operation `force` query parameter

**TypeSpec source**

```typespec
delete is ArmResourceDeleteWithoutOkAsync<
  StorageTarget,
  Parameters = {
    @query("force")
    force?: string;
  },
  Response =
    | ArmDeletedResponse
    | ArmDeleteAcceptedLroResponse<LroHeaders = ArmCombinedLroHeaders &
        Azure.Core.Foundations.RetryAfterHeader>
    | ArmDeletedNoContentResponse,
  Error = CloudError
>;
```

**Emitted OpenAPI or validator behavior**

No `ParametersInPointGet` diagnostic is expected for this operation because it
is a point `delete`, not a point `get`. The same condition belongs to the
broader staging-only Swagger
`ValidQueryParametersForPointOperations` comparison.

| Engine            | Observed result                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | No `ParametersInPointGet` diagnostic because the operation verb is `delete`.                                                                                     |
| TypeSpec lint     | `valid-query-parameters-for-point-operations` reports `force` because the migrated TypeSpec rule intentionally covers point `get`, `put`, `patch`, and `delete`. |

**Explanation:** The production Swagger rule is GET-only, while the migrated
TypeSpec rule intentionally maps both this GET-only rule and the staging-only
all-verbs point-operation rule. The staging comparison has 62 Swagger projects,
62 TypeSpec projects, and no one-sided projects, so this TypeSpec-only project
is expected broader-rule coverage rather than a false positive.

**Disposition:** Intentional extra coverage from the shared broader migrated
rule; no production rule change is required.

## Compile failures

Six projects failed TypeSpec compilation in the full run:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Failed projects cannot establish behavioral equivalence and are excluded when
necessary. None affects this rule's observed Swagger population: the comparison
records zero unassessed `ParametersInPointGet` projects.

## Raw and deduplicated diagnostic cardinality

Swagger reports emitted OpenAPI operation-parameter occurrences, while TypeSpec
reports semantic source targets that may be instantiated or reused across
operations and API versions. The TypeSpec total also includes three additional
HTTP verbs. Consequently, the 189 and 724 raw diagnostics are supporting
evidence only and are not expected to match.

No rule-specific canonical deduplication is applied to `ParametersInPointGet`
because the intentionally shared TypeSpec rule spans a broader verb set than
this production Swagger rule. The linked staging-rule investigation records the
deduplicated operation-parameter/source-target analysis used to validate the
shared implementation; for this GET-only rule, project-level overlap of all 40
Swagger projects is the behavioral equivalence criterion.

## Fixture evidence

The `extra-query-param` fixture emits a point GET with a `filter` query
parameter. Swagger reports `ParametersInPointGet` on the GET parameter array,
and TypeSpec reports
`valid-query-parameters-for-point-operations` on the authored `filter`
parameter. The shared rule's broader fixture suite separately covers compliant
api-version-only operations, collection GETs, providerless paths, nested point
resources, multiple query parameters, and legacy routed point GETs.
