# PatchBodyParametersSchema migration evidence

## Conclusion

The migrated TypeSpec rule required an update. The Swagger rule rejects three PATCH body property shapes: required properties, default-valued properties, and properties whose emitted `x-ms-mutability` is exactly `["create"]`. The previous TypeSpec rule covered required and default-valued properties, but missed create-only lifecycle visibility and was narrower than Swagger's top-level `identity` exception.

This change adds the create-only branch and mirrors Swagger's unconditional skip for a top-level PATCH body property named `identity`. The rule is closer to functional parity, but it remains classified as **partial** because the latest full corpus still has four validator-only projects and 34 TypeSpec-only projects that need project-specific explanation before claiming complete equivalence. Raw diagnostic equality is not expected because Swagger reports emitted OpenAPI occurrences and TypeSpec reports semantic source properties.

## Required TypeSpec changes

- Production rule: `src/rules/patch-body-parameters-schema.ts`
  - report a warning when `@visibility(Lifecycle.Create)` emits `x-ms-mutability: ["create"]`;
  - skip top-level `identity` before checking or recursing, matching the Swagger implementation.
- Fixtures:
  - `required-patch-property`: existing required-property violation;
  - `default-patch-property`: default-valued PATCH property violation;
  - `create-only-patch-property`: create-only lifecycle visibility violation;
  - `top-level-identity-compliant`: validator-clean top-level `identity` regression.

## Reports reconciled

| Report                 | Source                                                                                                                                                                              |                                     Population | PatchBodyParametersSchema row                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External snapshot      | `docs/coverage_old.md`, source `https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a`                                                                           |     450 compiled projects, 210 validator rules | `partial`; validator fired 87 projects; local lint fired 85; official 0; 97.7%                                                                                                              |
| Local lint-diff corpus | `specs/coverage-breakdown.md`, specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, generated `2026-08-12T04:34:01.330Z` by `test/harness/typespec-results.ts`/coverage refresh | full run, 462/468 successful TypeSpec projects | `production`, `partial`; validator fired 93 projects; TypeSpec fired 123; same-project overlap 89; validator-only 4; TypeSpec-only 34; validator diagnostics 703; TypeSpec diagnostics 1243 |

The report differences are caused by different snapshots and coverage definitions. The external snapshot credits aggregate local-lint project coverage over 450 compiled projects and does not provide one-sided project lists. The lint-diff report uses the pinned specs dataset, excludes TypeSpec compile failures from both sides, and credits only same-project observed diagnostics.

## Aligned project sets

- Validator projects: 93
- TypeSpec projects: 123
- Same-project overlap: 89
- Validator-only projects:
  - `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview`
  - `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger`
  - `specification/devcenter/resource-manager/Microsoft.DevCenter/DevCenter`
  - `specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute`
- TypeSpec-only projects:
  - `specification/apicenter/ApiCenter.Management`
  - `specification/applink/AppLink.Management`
  - `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer`
  - `specification/azureresiliencemanagement/resource-manager/Microsoft.AzureResilienceManagement/AzureResilienceManagement`
  - `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
  - `specification/cloudhealth/resource-manager/Microsoft.CloudHealth/CloudHealth`
  - `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`
  - `specification/containerservice/resource-manager/Microsoft.ContainerService/fleet`
  - `specification/databasewatcher/resource-manager/Microsoft.DatabaseWatcher/DatabaseWatcher`
  - `specification/discovery/Discovery.Management`
  - `specification/edge/resource-manager/Microsoft.Edge/configurationmanager`
  - `specification/edge/resource-manager/Microsoft.Edge/configurations`
  - `specification/edge/resource-manager/Microsoft.Edge/disconnectedOperations`
  - `specification/github-network/GitHub.Network.Management`
  - `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`
  - `specification/impact/Impact.Management`
  - `specification/informatica/resource-manager/Informatica.DataManagement/Informatica`
  - `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations`
  - `specification/liftrastronomer/resource-manager/Astronomer.Astro/AstronomerAstro`
  - `specification/liftrmongodb/MongoDB.Atlas.Management`
  - `specification/manufacturingplatform/Manufacturingplatform.Management`
  - `specification/migrate/resource-manager/Microsoft.Migrate/AssessmentProjects`
  - `specification/mission/resource-manager/Microsoft.Mission/Mission`
  - `specification/monitoringservice/resource-manager/Microsoft.Monitor/PipelineGroups`
  - `specification/onlineexperimentation/OnlineExperimentation.Management`
  - `specification/oracle/resource-manager/Oracle.Database/OracleDatabase`
  - `specification/postgresql/DBforPostgreSQL.Management`
  - `specification/programmableconnectivity/ProgrammableConnectivity.Management`
  - `specification/purestorage/resource-manager/PureStorage.Block/PureStorageBlock`
  - `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`
  - `specification/servicenetworking/resource-manager/Microsoft.ServiceNetworking/ServiceNetworking`
  - `specification/sovereign/resource-manager/Microsoft.Sovereign/Sovereign`
  - `specification/splitio/SplitIO.Experimentation.Management`
  - `specification/workloads/Workloads.SAPMonitor.Management`

The four validator-only projects are still real assessment gaps in the latest corpus. Sample validator findings are nested required discriminator/resource fields in AccessReview, required `location` in ConfidentialLedger, and required nested `name` fields in DevCenter and HybridCompute emitted PATCH schemas. They are not explained away by compile failure, because all four projects are in the successful aligned population.

The TypeSpec-only projects mostly come from semantic source properties that do not have a same-project validator finding in the selected emitted Swagger. Samples include defaulted PATCH properties in ApiCenter and AzureDataTransfer, required nested PATCH properties in AppLink and CloudHealth, and the new create-only lifecycle branch in AzureResilienceManagement. These may reflect newer TypeSpec-only services, projection/emission differences, or Swagger validator occurrence differences, so they are retained as one-sided evidence instead of being normalized away.

## Diagnostic cardinality

Over the 462 successful projects:

- Validator raw diagnostics: 703
- Validator raw identities (`project + swaggerFile + jsonPath`): 276
- Validator file-independent identities (`project + jsonPath`): 276
- TypeSpec raw diagnostics: 1243
- TypeSpec source identities (`project + sourceFile + line + column`): 996

Largest raw-count outliers:

| Project                                                                   | Validator | TypeSpec | Difference | Likely cause                                                                                                     |
| ------------------------------------------------------------------------- | --------: | -------: | ---------: | ---------------------------------------------------------------------------------------------------------------- |
| `specification/iotoperationsmq/IoTOperationsMQ.Management`                |        55 |      179 |       +124 | TypeSpec reports many semantic nested properties that collapse or differ in emitted Swagger occurrence identity. |
| `specification/discovery/Discovery.Management`                            |         0 |       45 |        +45 | TypeSpec-only source diagnostics with no validator project firing in the aligned Swagger output.                 |
| `specification/edge/resource-manager/Microsoft.Edge/configurationmanager` |         0 |       32 |        +32 | TypeSpec-only source diagnostics with no validator project firing.                                               |
| `specification/deviceregistry/DeviceRegistry.Management`                  |         2 |       27 |        +25 | TypeSpec semantic diagnostics exceed emitted validator occurrences.                                              |
| `specification/eventgrid/resource-manager/Microsoft.EventGrid/EventGrid`  |        62 |       51 |        -11 | Swagger emitted occurrence count exceeds TypeSpec source targets.                                                |

These counts are evidence for source-to-emission multiplicity, not a requirement for equality.

## Compile failures

The full corpus run had six TypeSpec compile failures, excluded from the aligned behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

No PatchBodyParametersSchema validator-only project is hidden by these failures.

## Fixture evidence

Focused validation with `LINTDIFF_VALIDATOR_ROOT=C:\dev\azure-openapi-validator` covered four local fixtures:

- `required-patch-property`: Swagger and TypeSpec both report the required property.
- `default-patch-property`: Swagger and TypeSpec both report the default-valued property.
- `create-only-patch-property`: Swagger reports `x-ms-mutability: ["create"]`; TypeSpec now reports the corresponding `@visibility(Lifecycle.Create)` property.
- `top-level-identity-compliant`: Swagger is clean; TypeSpec now emits no mapped `patch-body-parameters-schema` diagnostic. Unrelated fixture noise is recorded in `expect.json`.

The TypeSpec rule intentionally does not copy the Swagger implementation's truthiness check for defaults. Swagger checks `properties[prop].default`, which misses falsy emitted defaults such as `false`, `0`, or `""`; the TypeSpec rule continues to flag any authored default value because the rule requirement is that PATCH body properties must not have defaults.

Review suggested treating `Lifecycle.Create` plus non-emitted lifecycle members such as `Lifecycle.Delete` as create-only. A focused regression attempt showed that the property is omitted from the PATCH schema and Swagger does not report it, so that suggestion was rejected to avoid a TypeSpec-only false positive.

## Remaining uncertainty

The production rule now covers the known authorable Swagger branches and avoids the identified identity false positive. It should not be marked fully equivalent yet because the latest full corpus still has unexplained one-sided projects. The remaining work is project-specific analysis of those one-sided projects, not another known missing branch in the rule implementation.
