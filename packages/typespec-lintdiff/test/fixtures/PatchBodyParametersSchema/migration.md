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

The checked-in `specs/coverage-breakdown.json` row generated on `2026-08-10T09:38:18.108Z` listed 39 TypeSpec-only projects. The post-change full corpus used for the main conclusion above reduced that to 34, but the checked-in 39-project set was analyzed because it is the set visible in the current comparison report.

Each of the 39 projects was checked independently against the actual checked-in result files. For every project, the validator result file has zero `PatchBodyParametersSchema` diagnostics. The emitted Swagger under that project was then walked through PATCH body schemas with `$ref` and `allOf` resolution, the top-level `identity` skip, recursive object traversal, `required`, `default`, and `x-ms-mutability` checks matching the validator behavior. The TypeSpec diagnostic path was only treated as emitted evidence when it matched an exact emitted PATCH property path; seven weaker suffix/name matches were conservatively counted as `not-found-in-patch-swagger`.

Across those 39 projects there were 262 TypeSpec-only diagnostics:

- 25 diagnostics are exact emitted PATCH paths with falsy defaults. Swagger does not report them because the validator implementation checks `properties[prop].default` truthily, so `false`, `0`, or `""` are skipped.
- 170 diagnostics are exact emitted PATCH paths for source-required or source create-only shapes that are emitted as optional or otherwise non-violating in the selected PATCH Swagger schema. These are source-vs-emission/projection differences and should not be counted as validator misses.
- 67 diagnostics refer to TypeSpec source paths that have no exact emitted PATCH property path in the selected project/version. These are reachability, projection, version, or identity-shape differences rather than same-shape Swagger misses.

| Project                                                                                                                  | TSP diagnostics | Exact-path verification result                                                                                                                                                                                       | Example                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `specification/apicenter/ApiCenter.Management`                                                                           |               1 | 1 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.restore` at `models.tsp:240:3`                                                               |
| `specification/applink/AppLink.Management`                                                                               |               7 | 5 emitted-optional-or-different-patch-schema; 2 not-found-in-patch-swagger. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                       | required `properties.metadata` at `applinkmember.tsp:27:3`                                                       |
| `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer`                         |               2 | 2 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.rulesets.archives.minimumSizeForExpansion` at `models.flowprofile.tsp:217:3`                 |
| `specification/azureresiliencemanagement/resource-manager/Microsoft.AzureResilienceManagement/AzureResilienceManagement` |              24 | 18 emitted-optional-or-different-patch-schema; 6 not-found-in-patch-swagger. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                      | required `properties.goalTemplateId` at `models/goals/goalAssignment.tsp:30:3`                                   |
| `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`                               |               3 | 3 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.renew` at `models.tsp:1428:3`                                                                |
| `specification/cloudhealth/resource-manager/Microsoft.CloudHealth/CloudHealth`                                           |               2 | 2 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `properties.discovery.scope` at `main.tsp:95:3`                                                         |
| `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`                               |               6 | 5 emitted-optional-or-different-patch-schema; 1 falsy-default-validator-truthiness. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                               | required `properties.schedule.scheduledTime` at `scheduledactionmodels.tsp:19:3`                                 |
| `specification/containerservice/resource-manager/Microsoft.ContainerService/fleet`                                       |               2 | 2 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties` at `gate.tsp:170:3`                                                                        |
| `specification/databasewatcher/resource-manager/Microsoft.DatabaseWatcher/DatabaseWatcher`                               |               5 | 5 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.datastore.kustoClusterUri` at `watcher.tsp:93:3`                                            |
| `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`                                           |               1 | 1 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `identity.type` at `models.tsp:3540:3`                                                                  |
| `specification/discovery/Discovery.Management`                                                                           |              45 | 30 not-found-in-patch-swagger; 14 emitted-optional-or-different-patch-schema; 1 falsy-default-validator-truthiness. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.  | required `properties.keyVaultProperties.keyVaultUri` at `../Discovery.Management.Shared/control-plane.tsp:199:3` |
| `specification/edge/resource-manager/Microsoft.Edge/configurationmanager`                                                |              32 | 27 emitted-optional-or-different-patch-schema; 5 not-found-in-patch-swagger. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                      | required `name` at `DynamicSchema.tsp:49:3`                                                                      |
| `specification/edge/resource-manager/Microsoft.Edge/configurations`                                                      |               4 | 4 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `name` at `Configuration.tsp:31:3`                                                                      |
| `specification/edge/resource-manager/Microsoft.Edge/disconnectedOperations`                                              |               5 | 4 emitted-optional-or-different-patch-schema; 1 not-found-in-patch-swagger. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                       | required `properties.billingConfiguration.autoRenew` at `models.tsp:483:3`                                       |
| `specification/elasticsan/resource-manager/Microsoft.ElasticSan/ElasticSan`                                              |               1 | 1 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `identity.type` at `models.tsp:580:3`                                                                   |
| `specification/github-network/GitHub.Network.Management`                                                                 |               1 | 1 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `name` at `NetworkSettingsResource.tsp:25:3`                                                            |
| `specification/healthcareapis/resource-manager/Microsoft.HealthcareApis/HealthcareApis`                                  |               3 | 3 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `identity.type` at `models.tsp:1044:3`                                                                  |
| `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`                                |               3 | 3 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.vmProfile.vmSize` at `models.tsp:652:3`                                                      |
| `specification/impact/Impact.Management`                                                                                 |               8 | 6 not-found-in-patch-swagger; 2 emitted-optional-or-different-patch-schema. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                          | required `properties.connectorId` at `connectors.tsp:64:3`                                                       |
| `specification/informatica/resource-manager/Informatica.DataManagement/Informatica`                                      |               1 | 1 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.serverlessRuntimeNetworkProfile.networkInterfaceConfiguration` at `main.tsp:840:3`          |
| `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations`            |               2 | 2 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.ociRepository.insecure` at `models.tsp:1299:3`                                               |
| `specification/liftrastronomer/resource-manager/Astronomer.Astro/AstronomerAstro`                                        |               8 | 8 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.marketplace.offerDetails` at `LiftrBase/main.tsp:65:3`                                      |
| `specification/liftrmongodb/MongoDB.Atlas.Management`                                                                    |               4 | 4 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.user.firstName` at `main.tsp:45:3`                                                          |
| `specification/manufacturingplatform/Manufacturingplatform.Management`                                                   |               6 | 6 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.fabricProfile.keyUri` at `main.tsp:347:3`                                                   |
| `specification/migrate/resource-manager/Microsoft.Migrate/AssessmentProjects`                                            |               1 | 1 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `name` at `Common/ArmModels/AssessmentProjectV2.tsp:19:3`                                               |
| `specification/mission/resource-manager/Microsoft.Mission/Mission`                                                       |              11 | 9 emitted-optional-or-different-patch-schema; 1 falsy-default-validator-truthiness; 1 not-found-in-patch-swagger. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger. | required `properties.enclaveVirtualNetwork` at `resourcetypes/virtualEnclave/virtualenclave.tsp:170:3`           |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/ScheduledQueryRuleApi`                               |               1 | 1 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `identity.type` at `../Common/main.tsp:87:3`                                                            |
| `specification/monitoringservice/resource-manager/Microsoft.Monitor/PipelineGroups`                                      |               7 | 7 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.receivers` at `typespec/pipelineGroup.tsp:50:3`                                             |
| `specification/onlineexperimentation/OnlineExperimentation.Management`                                                   |               1 | 1 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `sku.name` at `models.tsp:144:3`                                                                        |
| `specification/oracle/resource-manager/Oracle.Database/OracleDatabase`                                                   |               6 | 6 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.dataCollectionOptions.isDiagnosticsEventsEnabled` at `models/common.tsp:147:3`               |
| `specification/postgresql/DBforPostgreSQL.Management`                                                                    |               4 | 3 falsy-default-validator-truthiness; 1 not-found-in-patch-swagger. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                   | default `properties.highAvailability.standbyAvailabilityZone` at `models.tsp:3517:3`                             |
| `specification/programmableconnectivity/ProgrammableConnectivity.Management`                                             |               6 | 6 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `properties.configuredApplication.name` at `Gateway.tsp:167:3`                                          |
| `specification/purestorage/resource-manager/PureStorage.Block/PureStorageBlock`                                          |              13 | 13 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                    | required `properties.user.firstName` at `LiftrBase/main.tsp:142:3`                                               |
| `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`                               |               2 | 2 falsy-default-validator-truthiness. Falsy default is present in PATCH Swagger; Swagger skips because it checks default truthiness.                                                                                 | default `properties.renew` at `models.tsp:2169:3`                                                                |
| `specification/servicenetworking/resource-manager/Microsoft.ServiceNetworking/ServiceNetworking`                         |               5 | 5 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.securityPolicyConfigurations.wafSecurityPolicy.id` at `main.tsp:231:3`                      |
| `specification/sovereign/resource-manager/Microsoft.Sovereign/Sovereign`                                                 |              21 | 21 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                    | required `properties.storageAccount` at `landingZoneAccountResourceProperties.tsp:15:3`                          |
| `specification/splitio/SplitIO.Experimentation.Management`                                                               |               6 | 6 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `properties.accessPolicy` at `main.tsp:40:5`                                                            |
| `specification/workloads/Workloads.SAPMonitor.Management`                                                                |               1 | 1 emitted-optional-or-different-patch-schema. Source required/create-only shape is emitted optional or otherwise non-violating in PATCH Swagger.                                                                     | required `name` at `SapLandscapeMonitor.tsp:29:3`                                                                |
| `specification/workloads/Workloads.SAPVirtualInstance.Management`                                                        |               1 | 1 not-found-in-patch-swagger. Source diagnostic path was not found in emitted PATCH Swagger for the selected project/version.                                                                                        | required `identity.type` at `models.tsp:2516:3`                                                                  |

The falsy-default category is not a TypeSpec false alert. For each project in that category, the exact emitted PATCH property path contains a default value that Swagger skips only because of the validator's truthiness check; ApiCenter's `ServiceUpdateProperties.restore` with `"default": false` is one concrete example. The second and third categories are not Swagger validator misses; they are differences between TypeSpec source diagnostics and the emitted PATCH schemas that the Swagger validator actually receives.

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
