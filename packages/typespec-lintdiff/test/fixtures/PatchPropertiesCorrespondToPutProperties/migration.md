# PatchPropertiesCorrespondToPutProperties migration evidence

## Conclusion

A dedicated TypeSpec rule was required. The imported mapping reused `consistent-patch-properties`, which compares PATCH properties with the resource response model and preserves nesting. The Swagger rule instead pairs PUT and PATCH operations by emitted path, requires both request bodies, flattens nested request properties, and compares the resulting leaves. The new `patch-properties-correspond-to-put-properties` rule follows that distinct authoring contract across every same-path PUT/PATCH pair in an ARM HTTP service, uses emitted JSON names, handles `void` bodies, and uses Autorest-compatible visibility/schema-sharing metadata.

The intended property-presence behavior is covered, but this migration remains **partial relative to the staging validator implementation**. Its undocumented `lodash.isEqual` comparison treats the complete emitted property schema as property identity. It therefore reports differences in descriptions, `readOnly`, constraints, and `x-ms-client-name`, and conflates same-named leaves after discarding nesting. The TypeSpec rule intentionally does not reproduce these false positives. The final corpus has no TypeSpec-only projects, but 281 validator-only projects remain, primarily from that staging-only defect; raw diagnostic equality and implementation-level equivalence are not claimed.

## Evidence provenance

- External report: `packages/typespec-lintdiff/docs/coverage_old.md` (source gist linked in that file), 450 compiled projects and 210 validator rules. Its row reports 308 fired projects, 20 local-lint projects, 0 official-rule projects, and 6.5% coverage under a different snapshot/methodology.
- Current dataset: azure-rest-api-specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, recorded in `packages/typespec-lintdiff/specs/_meta.json`.
- Final TypeSpec run: `2026-09-04T19:24:35.932Z`, full scope, 462 of 468 projects, 6 compile failures, duration 1334907 ms.
- Staging validator source: `packages/rulesets/src/spectral/functions/patch-properties-correspond-to-put-properties.ts` in azure-openapi-validator. The catalog marks this rule `stagingOnly: true`.
- Generated `packages/typespec-lintdiff/specs` changes are validation evidence only and are excluded from this PR.

## Existing official coverage

The registered official ARM rule `arm-resource-patch` checks that a PATCH body exists and that top-level PATCH properties occur in the ARM resource model. Standard `ResourceUpdateModel` templates also derive PATCH shapes from resource properties. Coverage is partial: custom body shapes remain authorable, nested PUT/PATCH leaf correspondence is not compared, and the official rule does not pair request bodies by emitted HTTP path. RPC guideline coverage classifies standard PUT/PATCH semantics as template-enforced, not this complete cross-body check.

## Implemented changes

- Added and enabled `tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties`.
- Grouped every PUT and PATCH operation in ARM HTTP services by emitted route, matching the Swagger path-item scope.
- Ignored same-endpoint overload siblings, matching the HTTP layer's emitted-endpoint uniqueness logic before route pairing.
- Declared `projectionScope: http-reachable` so corpus comparison retains only diagnostics reachable from the dataset-selected API version's HTTP operations.
- Reported missing, `void`, and property-free PATCH bodies, implementing the documented
  at-least-one-property requirement that the Swagger implementation accidentally checks only at
  the body-parameter-array level.
- Flattened model-valued properties to leaves while treating scalars, arrays, records, multi-model unions, and empty models as leaf schemas, matching the validator traversal shape.
- Preserved nested `allOf`-only wrappers as leaves because the validator descends only through a nested schema with direct `properties`.
- Compared `@encodedName` JSON names rather than authored property identifiers.
- Used request visibility and Autorest-compatible schema-sharing rules so read-only and `x-ms-mutability` properties reflect emitted Swagger schemas.
- Kept the path-sensitive `consistent-patch-properties` rule separate because the two validator rules disagree about nesting.

## Emission matrix

| Authored shape                                            | Emission/traversal branch                          | Selected OpenAPI field         | Expected Swagger         | Expected TypeSpec | Fixture                              |
| --------------------------------------------------------- | -------------------------------------------------- | ------------------------------ | ------------------------ | ----------------- | ------------------------------------ |
| PATCH leaf absent from PUT                                | resolved nested `properties` recursion             | PATCH leaf name only           | violation                | violation         | `patch-extra-property`               |
| Same authored name, different JSON names                  | `resolveEncodedName` / `x-ms-client-name`          | different property keys        | violation                | violation         | `encoded-name-mismatch`              |
| Differently named inherited-only wrappers                 | nested `allOf` without direct `properties`         | wrapper property keys          | violation                | violation         | `allof-wrapper-name-mismatch`        |
| PATCH subset of PUT                                       | ordinary model properties                          | matching leaf names            | clean                    | clean             | `compliant-subset`                   |
| Same leaf at different levels                             | recursive helper discards containers               | matching leaf name             | clean                    | clean             | `different-nesting-compliant`        |
| Different authored names, same JSON name                  | encoded property plus differing `x-ms-client-name` | same key, unequal full schemas | false positive           | clean             | `encoded-name-compliant`             |
| Same key/type, different documentation                    | emitted property `description`                     | same key, unequal full schemas | false positive           | clean             | `schema-value-validator-discrepancy` |
| No PATCH body / `void` body                               | Autorest omits body parameter                      | no PATCH body parameter        | violation                | violation         | `missing-patch-body`                 |
| Empty PATCH body model                                    | emitted body schema has no leaf properties         | empty property set             | validator false negative | violation         | `empty-patch-model`                  |
| No PUT body                                               | Autorest omits body parameter                      | no PUT body parameter          | violation                | violation         | `missing-put-body`                   |
| Scalar, array, record, union, nullable model, empty model | scalar/fallthrough and single-model-union branches | corresponding leaf names       | clean                    | clean             | `type-family-compliant`              |

The Autorest path is visible in `packages/typespec-autorest/src/openapi.ts`: `void` bodies are omitted, body models are emitted through request visibility transforms, and property metadata becomes Swagger schema fields. The rule uses the same `resolveRequestVisibility`, `MetadataInfo.isTransformed`, `isPayloadProperty`, and schema-sharing policy used by the adjacent PATCH emission-aware lint.

## Report reconciliation

| Report                     | Mode/population                       | Validator projects | TypeSpec projects |             Overlap |      Validator-only | TypeSpec-only | Raw diagnostics             |
| -------------------------- | ------------------------------------- | -----------------: | ----------------: | ------------------: | ------------------: | ------------: | --------------------------- |
| External `coverage_old.md` | older aggregate snapshot              |                308 |                20 | not reconstructable | not reconstructable |  not reported | not reported                |
| Final local report         | staging rule, 462 successful projects |                316 |                35 |                  35 |                 281 |             0 | validator 1374; TypeSpec 94 |

The count gap is caused first by snapshot/population differences (450 versus 468 source projects), then by execution mode (the current rule is staging-only), mapping changes (a dedicated lint replaces the shared imported mapping), and aggregation identity. Most importantly, the staging validator compares full leaf-schema objects while the TypeSpec lint implements documented property-name correspondence. Raw Swagger occurrences and semantic TypeSpec targets are not normalized because no collision-resistant one-to-one identity exists. The rule produced 96 raw TypeSpec diagnostics; HTTP-reachable selected-version projection retained 94. The two excluded diagnostics came from the unassessed compile-failure project `specification/quota/resource-manager/Microsoft.Quota/Quota`, not from an older-version-only target. No TypeSpec-only project remains in the aligned population.

## Code-backed gap examples

### Gap example: staging validator deep-equality false positive

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** `specification/agricultureplatform/AgriculturePlatform.Management` / `2024-06-01-preview`
- **Source:** standard `ResourceUpdateModel<AgriServiceResource, AgriServiceResourceProperties>` in `main.tsp`

**TypeSpec source**

```typespec
update is ArmCustomPatchAsync<
  AgriServiceResource,
  Azure.ResourceManager.Foundations.ResourceUpdateModel<
    AgriServiceResource,
    AgriServiceResourceProperties
  >
>;
```

**Emitted OpenAPI or validator behavior**

```json
// PATCH nested managed-identity leaf
{ "type": "string", "enum": ["None", "SystemAssigned", "UserAssigned", "SystemAssigned,UserAssigned"] }
// PUT resource-envelope leaf with the same flattened name
{ "type": "string", "readOnly": true }
```

| Engine            | Observed result                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Swagger validator | Reports `type` because it discards nesting and deep-compares the unequal schema objects. |
| TypeSpec lint     | No diagnostic: `type` is present in both flattened request-body leaf-name sets.          |

**Explanation:** The documented rule asks whether a property is present. The staging implementation instead uses `differenceWith(..., isEqual)` over one-key schema objects, so unrelated same-named leaves and harmless schema metadata differences become violations.

**Disposition:** Intentional TypeSpec behavior; do not copy the staging validator defect.

### Gap example: emitted client-name metadata

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** focused fixture / generated fixture Swagger
- **Source:** `encoded-name-compliant/main.tsp`

**TypeSpec source**

```typespec
@encodedName("application/json", "sharedName") putName?: string;
@encodedName("application/json", "sharedName") patchName?: string;
```

**Emitted OpenAPI or validator behavior**

```json
"sharedName": { "type": "string", "x-ms-client-name": "putName" }
"sharedName": { "type": "string", "x-ms-client-name": "patchName" }
```

| Engine            | Observed result                                               |
| ----------------- | ------------------------------------------------------------- |
| Swagger validator | Reports `sharedName` because `x-ms-client-name` differs.      |
| TypeSpec lint     | No diagnostic because both properties emit the same JSON key. |

**Disposition:** Reviewed validator discrepancy recorded in `expect.json`.

### Gap example: emitted void PATCH body

- **Classification:** count-only
- **Status:** fixed
- **Project/API version:** `specification/providerhub/ProviderHub.Management` / `2024-09-01`
- **Source:** `ProviderMonitorSetting.tsp`

**TypeSpec source**

```typespec
update is Azure.ResourceManager.Legacy.CustomPatchSync<
  ProviderMonitorSetting,
  PatchModel = void
>;
```

**Emitted OpenAPI or validator behavior**

```json
"patch": { "parameters": [{ "in": "path" }] }
```

| Engine            | Observed result                                                                  |
| ----------------- | -------------------------------------------------------------------------------- |
| Swagger validator | Reports `Patch operations body cannot be empty.`                                 |
| TypeSpec lint     | Reports the PATCH operation after explicitly treating `void` as an omitted body. |

**Disposition:** Rule fix, proven by `missing-patch-body` and the filtered ProviderHub corpus rerun.

## Final project sets

### Overlap (35)

- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/applink/AppLink.Management`
- `specification/automation/Automation.Management`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCI`
- `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
- `specification/cdn/resource-manager/Microsoft.Cdn/EdgeActions`
- `specification/certificateregistration/resource-manager/Microsoft.CertificateRegistration/CertificateRegistration`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeGallery`
- `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/RegistryTasks`
- `specification/containerstorage/resource-manager/Microsoft.ContainerStorage/ContainerStorage`
- `specification/databox/resource-manager/Microsoft.DataBox/DataBox`
- `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`
- `specification/desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`
- `specification/discovery/Discovery.Management`
- `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`
- `specification/hybridconnectivity/HybridConnectivity.Management`
- `specification/informatica/resource-manager/Informatica.DataManagement/Informatica`
- `specification/kubernetesruntime/resource-manager/Microsoft.KubernetesRuntime/KubernetesRuntime`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/management/resource-manager/Microsoft.Management/ManagementGroups`
- `specification/msi/resource-manager/Microsoft.ManagedIdentity/ManagedIdentity`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/powerplatform/resource-manager/Microsoft.PowerPlatform/PowerPlatform`
- `specification/providerhub/ProviderHub.Management`
- `specification/recoveryservicesdatareplication/resource-manager/Microsoft.DataReplication/DataReplication`
- `specification/recoveryservicessiterecovery/resource-manager/Microsoft.RecoveryServices/SiteRecovery`
- `specification/resources/resource-manager/Microsoft.Resources/deploymentScripts`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/servicefabric/resource-manager/Microsoft.ServiceFabric/ServiceFabric`
- `specification/sphere/resource-manager/Microsoft.AzureSphere/AzureSphere`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/storage/Storage.Management`
- `specification/vmware/resource-manager/Microsoft.AVS/AVS`
- `specification/web/resource-manager/Microsoft.Web/AppService`

### Validator-only (281)

- `specification/agricultureplatform/AgriculturePlatform.Management`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertProcessingRules`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/PrometheusRuleGroups`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/TenantActivityLogAlerts`
- `specification/apicenter/ApiCenter.Management`
- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/app/resource-manager/Microsoft.App/SreAgent`
- `specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbookTemplatesApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbooksApi`
- `specification/awsconnector/AccessAnalyzerAnalyzer.Management`
- `specification/awsconnector/AcmCertificateSummary.Management`
- `specification/awsconnector/ApiGatewayRestApi.Management`
- `specification/awsconnector/ApiGatewayStage.Management`
- `specification/awsconnector/AppSyncGraphqlApi.Management`
- `specification/awsconnector/AutoScalingAutoScalingGroup.Management`
- `specification/awsconnector/CloudFormationStack.Management`
- `specification/awsconnector/CloudFormationStackSet.Management`
- `specification/awsconnector/CloudFrontDistribution.Management`
- `specification/awsconnector/CloudTrailTrail.Management`
- `specification/awsconnector/CloudWatchAlarm.Management`
- `specification/awsconnector/CodeBuildProject.Management`
- `specification/awsconnector/CodeBuildSourceCredentialsInfo.Management`
- `specification/awsconnector/ConfigServiceConfigurationRecorder.Management`
- `specification/awsconnector/ConfigServiceConfigurationRecorderStatus.Management`
- `specification/awsconnector/ConfigServiceDeliveryChannel.Management`
- `specification/awsconnector/DatabaseMigrationServiceReplicationInstance.Management`
- `specification/awsconnector/DaxCluster.Management`
- `specification/awsconnector/DynamoDBContinuousBackupsDescription.Management`
- `specification/awsconnector/DynamoDBTable.Management`
- `specification/awsconnector/Ec2AccountAttribute.Management`
- `specification/awsconnector/Ec2Address.Management`
- `specification/awsconnector/Ec2FlowLog.Management`
- `specification/awsconnector/Ec2Image.Management`
- `specification/awsconnector/Ec2InstanceStatus.Management`
- `specification/awsconnector/Ec2Ipam.Management`
- `specification/awsconnector/Ec2KeyPair.Management`
- `specification/awsconnector/Ec2NetworkAcl.Management`
- `specification/awsconnector/Ec2NetworkInterface.Management`
- `specification/awsconnector/Ec2RouteTable.Management`
- `specification/awsconnector/Ec2SecurityGroup.Management`
- `specification/awsconnector/Ec2Snapshot.Management`
- `specification/awsconnector/Ec2Subnet.Management`
- `specification/awsconnector/Ec2VPCEndpoint.Management`
- `specification/awsconnector/Ec2VPCPeeringConnection.Management`
- `specification/awsconnector/Ec2Volume.Management`
- `specification/awsconnector/Ec2Vpc.Management`
- `specification/awsconnector/EcrImageDetail.Management`
- `specification/awsconnector/EcrRepository.Management`
- `specification/awsconnector/EcsCluster.Management`
- `specification/awsconnector/EcsService.Management`
- `specification/awsconnector/EcsTaskDefinition.Management`
- `specification/awsconnector/EfsFileSystem.Management`
- `specification/awsconnector/EfsMountTarget.Management`
- `specification/awsconnector/EksNodegroup.Management`
- `specification/awsconnector/ElasticBeanstalkApplication.Management`
- `specification/awsconnector/ElasticBeanstalkConfigurationTemplate.Management`
- `specification/awsconnector/ElasticBeanstalkEnvironment.Management`
- `specification/awsconnector/ElasticLoadBalancingV2Listener.Management`
- `specification/awsconnector/ElasticLoadBalancingV2LoadBalancer.Management`
- `specification/awsconnector/ElasticLoadBalancingV2TargetGroup.Management`
- `specification/awsconnector/ElasticLoadBalancingv2TargetHealthDescription.Management`
- `specification/awsconnector/EmrCluster.Management`
- `specification/awsconnector/GuardDutyDetector.Management`
- `specification/awsconnector/IamAccessKeyLastUsed.Management`
- `specification/awsconnector/IamAccessKeyMetadata.Management`
- `specification/awsconnector/IamGroup.Management`
- `specification/awsconnector/IamInstanceProfile.Management`
- `specification/awsconnector/IamMFADevice.Management`
- `specification/awsconnector/IamPasswordPolicy.Management`
- `specification/awsconnector/IamPolicyVersion.Management`
- `specification/awsconnector/IamRole.Management`
- `specification/awsconnector/IamServerCertificate.Management`
- `specification/awsconnector/IamVirtualMFADevice.Management`
- `specification/awsconnector/KmsAlias.Management`
- `specification/awsconnector/KmsKey.Management`
- `specification/awsconnector/LambdaFunction.Management`
- `specification/awsconnector/LambdaFunctionCodeLocation.Management`
- `specification/awsconnector/LightsailBucket.Management`
- `specification/awsconnector/LightsailInstance.Management`
- `specification/awsconnector/LogsLogGroup.Management`
- `specification/awsconnector/LogsLogStream.Management`
- `specification/awsconnector/LogsMetricFilter.Management`
- `specification/awsconnector/LogsSubscriptionFilter.Management`
- `specification/awsconnector/Macie2JobSummary.Management`
- `specification/awsconnector/MacieAllowList.Management`
- `specification/awsconnector/NetworkFirewallFirewall.Management`
- `specification/awsconnector/NetworkFirewallFirewallPolicy.Management`
- `specification/awsconnector/NetworkFirewallRuleGroup.Management`
- `specification/awsconnector/OpenSearchDomainStatus.Management`
- `specification/awsconnector/OrganizationsAccount.Management`
- `specification/awsconnector/OrganizationsOrganization.Management`
- `specification/awsconnector/RdsDBCluster.Management`
- `specification/awsconnector/RdsDBInstance.Management`
- `specification/awsconnector/RdsDBSnapshot.Management`
- `specification/awsconnector/RdsDBSnapshotAttributesResult.Management`
- `specification/awsconnector/RdsEventSubscription.Management`
- `specification/awsconnector/RdsExportTask.Management`
- `specification/awsconnector/RedshiftCluster.Management`
- `specification/awsconnector/RedshiftClusterParameterGroup.Management`
- `specification/awsconnector/Route53DomainsDomainSummary.Management`
- `specification/awsconnector/Route53HostedZone.Management`
- `specification/awsconnector/Route53ResourceRecordSet.Management`
- `specification/awsconnector/S3AccessControlPolicy.Management`
- `specification/awsconnector/S3AccessPoint.Management`
- `specification/awsconnector/S3Bucket.Management`
- `specification/awsconnector/S3BucketPolicy.Management`
- `specification/awsconnector/S3ControlMultiRegionAccessPointPolicyDocument.Management`
- `specification/awsconnector/SageMakerApp.Management`
- `specification/awsconnector/SageMakerNotebookInstanceSummary.Management`
- `specification/awsconnector/SecretsManagerResourcePolicy.Management`
- `specification/awsconnector/SecretsManagerSecret.Management`
- `specification/awsconnector/SnsSubscription.Management`
- `specification/awsconnector/SnsTopic.Management`
- `specification/awsconnector/SqsQueue.Management`
- `specification/awsconnector/SsmInstanceInformation.Management`
- `specification/awsconnector/SsmParameter.Management`
- `specification/awsconnector/SsmResourceComplianceSummaryItem.Management`
- `specification/awsconnector/WafWebACLSummary.Management`
- `specification/awsconnector/Wafv2LoggingConfiguration.Management`
- `specification/azure-kusto/resource-manager/Microsoft.Kusto/Kusto`
- `specification/azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData`
- `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer`
- `specification/azuredependencymap/resource-manager/Microsoft.DependencyMap/DependencyMap`
- `specification/azurefleet/resource-manager/Microsoft.AzureFleet/AzureFleet`
- `specification/azurelargeinstance/resource-manager/Microsoft.AzureLargeInstance/AzureLargeInstance`
- `specification/azureresiliencemanagement/resource-manager/Microsoft.AzureResilienceManagement/AzureResilienceManagement`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCIVM`
- `specification/cdn/resource-manager/Microsoft.Cdn/Cdn`
- `specification/chaos/resource-manager/Microsoft.Chaos/Chaos`
- `specification/cloudhealth/resource-manager/Microsoft.CloudHealth/CloudHealth`
- `specification/codesigning/resource-manager/Microsoft.CodeSigning/CodeSigning`
- `specification/communication/Communication.Management`
- `specification/communitytraining/resource-manager/Microsoft.Community/Community`
- `specification/compute/resource-manager/Microsoft.Compute/Bulkactions`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeDisk`
- `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`
- `specification/confluent/resource-manager/Microsoft.Confluent/Confluent`
- `specification/connectedcache/resource-manager/Microsoft.ConnectedCache/ConnectedCache`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/Registry`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aimanager`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aks`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/fleet`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/nodecustomization`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/preparedimagespecification`
- `specification/contosowidgetmanager/Contoso.Management`
- `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`
- `specification/dashboard/resource-manager/Microsoft.Dashboard/Dashboard`
- `specification/databasefleetmanager/resource-manager/Microsoft.DatabaseFleetManager/DatabaseFleetManager`
- `specification/databasewatcher/resource-manager/Microsoft.DatabaseWatcher/DatabaseWatcher`
- `specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge`
- `specification/databricks/resource-manager/Microsoft.Databricks/Databricks`
- `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`
- `specification/datamigration/resource-manager/Microsoft.DataMigration/DataMigration`
- `specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`
- `specification/dell/resource-manager/Dell.Storage/DellStorage`
- `specification/devcenter/resource-manager/Microsoft.DevCenter/DevCenter`
- `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`
- `specification/deviceregistry/DeviceRegistry.Management`
- `specification/devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure`
- `specification/devtestlabs/resource-manager/Microsoft.DevTestLab/DevTestLabs`
- `specification/dns/resource-manager/Microsoft.Network/Dns`
- `specification/dnsresolver/resource-manager/Microsoft.Network/DnsResolver`
- `specification/durabletask/resource-manager/Microsoft.DurableTask/DurableTask`
- `specification/dynatrace/resource-manager/Dynatrace.Observability/DynatraceObservability`
- `specification/edge/resource-manager/Microsoft.Edge/configurationmanager`
- `specification/edge/resource-manager/Microsoft.Edge/configurations`
- `specification/edge/resource-manager/Microsoft.Edge/disconnectedOperations`
- `specification/edgeorder/resource-manager/Microsoft.EdgeOrder/EdgeOrder`
- `specification/elastic/resource-manager/Microsoft.Elastic/Elastic`
- `specification/elasticsan/resource-manager/Microsoft.ElasticSan/ElasticSan`
- `specification/eventgrid/resource-manager/Microsoft.EventGrid/EventGrid`
- `specification/ews/resource-manager/Microsoft.SecretSyncController/SecretSyncController`
- `specification/extendedlocation/resource-manager/Microsoft.ExtendedLocation/CustomLocations`
- `specification/fabric/resource-manager/Microsoft.Fabric/Fabric`
- `specification/fileshares/resource-manager/Microsoft.FileShares/FileShares`
- `specification/fist/resource-manager/Microsoft.IoTFirmwareDefense/IoTFirmwareDefense`
- `specification/frontdoor/resource-manager/Microsoft.Network/FrontDoor`
- `specification/github-network/GitHub.Network.Management`
- `specification/hanaonazure/resource-manager/Microsoft.HanaOnAzure/HanaOnAzure`
- `specification/hardwaresecuritymodules/resource-manager/Microsoft.HardwareSecurityModules/HardwareSecurityModules`
- `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`
- `specification/healthbot/resource-manager/Microsoft.HealthBot/HealthBot`
- `specification/healthcareapis/resource-manager/Microsoft.HealthcareApis/HealthcareApis`
- `specification/healthdataaiservices/HealthDataAIServices.Management`
- `specification/horizondb/resource-manager/Microsoft.HorizonDb/HorizonDb`
- `specification/hybridaks/resource-manager/Microsoft.HybridContainerService/HybridContainerService`
- `specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute`
- `specification/hybridkubernetes/resource-manager/Microsoft.Kubernetes/HybridKubernetes`
- `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`
- `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`
- `specification/iotoperations/resource-manager/Microsoft.IoTOperations/IoTOperations`
- `specification/iotoperationsdataprocessor/IoTOperationsDataProcessor.Management`
- `specification/iotoperationsmq/IoTOperationsMQ.Management`
- `specification/iotoperationsorchestrator/IoTOperationsOrchestrator.Management`
- `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/extensions`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/privateLinkScopes`
- `specification/liftrarize/resource-manager/ArizeAi.ObservabilityEval/ObservabilityEval`
- `specification/liftrastronomer/resource-manager/Astronomer.Astro/AstronomerAstro`
- `specification/liftrcommvault/Commvault.ContentStore.Management`
- `specification/liftrhyperexecute/resource-manager/LambdaTest.HyperExecute/HyperExecute`
- `specification/liftrmongodb/MongoDB.Atlas.Management`
- `specification/liftrpinecone/resource-manager/Pinecone.VectorDb/PineconeVectorDb`
- `specification/liftrqumulo/resource-manager/Qumulo.Storage/QumuloStorage`
- `specification/liftrweightsandbiases/resource-manager/Microsoft.WeightsAndBiases/WeightsAndBiases`
- `specification/loadtestservice/resource-manager/Microsoft.LoadTestService/loadtesting`
- `specification/loadtestservice/resource-manager/Microsoft.LoadTestService/playwright`
- `specification/logic/resource-manager/Microsoft.Logic/Logic`
- `specification/managednetworkfabric/resource-manager/Microsoft.ManagedNetworkFabric/ManagedNetworkFabric`
- `specification/manufacturingplatform/Manufacturingplatform.Management`
- `specification/maps/resource-manager/Microsoft.Maps/Maps`
- `specification/migrate/resource-manager/Microsoft.Migrate/AssessmentProjects`
- `specification/migrate/resource-manager/Microsoft.OffAzure/OffAzure`
- `specification/mission/resource-manager/Microsoft.Mission/Mission`
- `specification/mongocluster/resource-manager/Microsoft.DocumentDB/MongoCluster`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActionGroupsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActivityLogAlertsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/AutoScaleApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/DataCollectionApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/LogProfilesApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/MetricAlertApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/PrivateLinkScopesApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ScheduledQueryRuleApi`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Agents`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/PipelineGroups`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/napster/Napster.CompanionAPI.Management`
- `specification/networkcloud/resource-manager/Microsoft.NetworkCloud/NetworkCloud`
- `specification/newrelic/NewRelicObservability.Management`
- `specification/nginx/resource-manager/Nginx.NginxPlus/NginxPlus`
- `specification/notificationhubs/resource-manager/Microsoft.NotificationHubs/NotificationHubs`
- `specification/onlineexperimentation/OnlineExperimentation.Management`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/oracle/resource-manager/Oracle.Database/OracleDatabase`
- `specification/orbitalplanetarycomputer/Orbital.Management`
- `specification/paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`
- `specification/peering/resource-manager/Microsoft.Peering/Peering`
- `specification/playwrighttesting/PlaywrightTesting.Management`
- `specification/portal/Dashboard.Management`
- `specification/postgresql/DBforPostgreSQL.Management`
- `specification/postgresqlhsc/resource-manager/Microsoft.DBforPostgreSQL/PostgresqlHsc`
- `specification/powerbidedicated/resource-manager/Microsoft.PowerBIdedicated/PowerBIDedicated`
- `specification/programenrollment/resource-manager/Microsoft.ProgramEnrollment/ProgramEnrollment`
- `specification/programmableconnectivity/ProgrammableConnectivity.Management`
- `specification/purestorage/resource-manager/PureStorage.Block/PureStorageBlock`
- `specification/purview/resource-manager/Microsoft.Purview/Purview`
- `specification/quantum/resource-manager/Microsoft.Quantum/Quantum`
- `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
- `specification/redhatopenshift/resource-manager/Microsoft.RedHatOpenShift/OpenShiftClusters`
- `specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise`
- `specification/relay/resource-manager/Microsoft.Relay/Relay`
- `specification/resourceconnector/resource-manager/Microsoft.ResourceConnector/ResourceConnector`
- `specification/resourcegraph/resource-manager/Microsoft.ResourceGraph/ResourceGraph/GraphQueryApi`
- `specification/scvmm/ScVmm.Management`
- `specification/search/resource-manager/Microsoft.Search/Search`
- `specification/security/resource-manager/Microsoft.Security/Security/AutomationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/IoTSecurityAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/PrivateLinksAPI`
- `specification/servicebus/resource-manager/Microsoft.ServiceBus/ServiceBus`
- `specification/servicefabricmanagedclusters/resource-manager/Microsoft.ServiceFabric/ServiceFabricManagedClusters`
- `specification/servicenetworking/resource-manager/Microsoft.ServiceNetworking/ServiceNetworking`
- `specification/solutions/Solutions.Management`
- `specification/sovereign/resource-manager/Microsoft.Sovereign/Sovereign`
- `specification/splitio/SplitIO.Experimentation.Management`
- `specification/sqlvirtualmachine/resource-manager/Microsoft.SqlVirtualMachine/SqlVirtualMachine`
- `specification/standbypool/resource-manager/Microsoft.StandbyPool/StandbyPool`
- `specification/storageactions/resource-manager/Microsoft.StorageActions/StorageActions`
- `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`
- `specification/storagediscovery/resource-manager/Microsoft.StorageDiscovery/StorageDiscovery`
- `specification/storagemover/resource-manager/Microsoft.StorageMover/StorageMover`
- `specification/storagesync/resource-manager/Microsoft.StorageSync/StorageSync`
- `specification/support/resource-manager/Microsoft.Support/Support`
- `specification/verifiedid/resource-manager/Microsoft.VerifiedId/VerifiedId`
- `specification/widget/resource-manager/Microsoft.Widget/Widget`
- `specification/workloads/Workloads.SAPDiscoverySite.Management`
- `specification/workloads/Workloads.SAPMonitor.Management`
- `specification/workloads/Workloads.SAPVirtualInstance.Management`

### TypeSpec-only (0)

- None.

## Compile failures

These six projects were excluded symmetrically from behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

They do not change the 462-project assessed population, but no claim is made about this rule in those projects.

## Focused validation

Eleven focused cases pass: six intended violations, three validator-clean compliance cases with reviewed ambient diagnostics, two reviewed staging-validator false-positive discrepancies, and one documented validator false-negative case for an empty body model. Snapshots preserve the emitted Swagger and both diagnostic sets. The final package build and focused validation were rerun after the HTTP-path, empty/`void`-body, nested `allOf` wrapper, and overload fixes.

## Remaining uncertainty

The 281 validator-only projects prevent implementation-level equivalence. The corpus and fixtures demonstrate the dominant deep-equality/flattening defect, but this PR does not assert that every one of the 1,374 staging diagnostics is individually false. The TypeSpec rule is functionally equivalent to the documented property-presence contract for the emission branches in the matrix, not raw-count equivalent to the staging implementation.
