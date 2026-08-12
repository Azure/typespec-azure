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

## Report reconciliation

The older external report records 38 Swagger projects and 37 TypeSpec projects
for `ParametersInPointGet` (97.4% coverage). It is a different corpus snapshot
and provides only aggregate counts, so the historical one-project difference
cannot be reconstructed from that report.

The checked-in lint-diff report uses azure-rest-api-specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`. Its full TypeSpec analysis was
refreshed on 2026-08-12 over all 468 discovered ARM projects, with 462
successfully compiled projects included in comparison counts. It records:

| Measure | Swagger | TypeSpec |
| --- | ---: | ---: |
| Projects | 40 | 62 |
| Diagnostics | 189 | 724 |
| Same-project overlap | 40 | 40 |
| One-sided projects | 0 | 22 |

All 40 Swagger projects are assessable and overlap the TypeSpec result. The
newer 40/40 observation supersedes the older aggregate 38/37 result for this
pinned population; it is not evidence that raw diagnostic counts should be
equal.

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
and DELETE operations.

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

## Diagnostic cardinality

Swagger reports emitted OpenAPI operation-parameter occurrences, while TypeSpec
reports semantic source targets that may be instantiated or reused across
operations and API versions. The TypeSpec total also includes three additional
HTTP verbs. Consequently, the 189 and 724 raw diagnostics are supporting
evidence only and are not expected to match.

## Fixture evidence

The `extra-query-param` fixture emits a point GET with a `filter` query
parameter. Swagger reports `ParametersInPointGet` on the GET parameter array,
and TypeSpec reports
`valid-query-parameters-for-point-operations` on the authored `filter`
parameter. The shared rule's broader fixture suite separately covers compliant
api-version-only operations, collection GETs, providerless paths, nested point
resources, multiple query parameters, and legacy routed point GETs.