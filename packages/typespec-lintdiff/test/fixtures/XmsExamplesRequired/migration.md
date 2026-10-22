# XmsExamplesRequired migration notes

## Conclusion

The migrated TypeSpec rule remains a **partial native approximation** of Swagger `XmsExamplesRequired`. This PR fixes one concrete semantic miss: `@Autorest.example(...)` emits `x-ms-examples`, so operations with that decorator must be compliant. The rule intentionally does **not** treat arbitrary external example files as lint evidence because the autorest emitter resolves `examples-dir`, version interpolation, and copied output paths during emission; a synchronous TypeSpec lint rule cannot safely prove that exact emitted example set from a generic source-program walk.

## Does the TypeSpec rule need to change?

Yes. Before this change the rule only accepted `@extension("x-ms-examples", ...)`. That missed an in-program authorable path that emits the selected OpenAPI field: `@Autorest.example(pathOrUri, title)`, written by `packages/typespec-autorest/src/openapi.ts` as `x-ms-examples[title] = { $ref: pathOrUri }`.

Required changes in this PR:

- Update `packages/typespec-lintdiff/src/rules/xms-examples-required.ts` to accept `@Autorest.example(...)` metadata.
- Add a compliant fixture for `@Autorest.example`.
- Update `rule.md` and this migration note.

## Source reports and revisions

| Report                                                                  | Revision / generation                                                                      | XmsExamplesRequired row                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `packages/typespec-lintdiff/docs/coverage_old.md`                       | checked-in external snapshot; aggregate only                                               | Fired 6, local lint 5, official 0, 83.3%                                                                            |
| `packages/typespec-lintdiff/specs/coverage-breakdown.md` before this PR | `f6b53f105b95da05276530a0754a1c71b4f16397`, generated 2026-08-10                           | Fired 5, TSP fired 458, overlap 4, validator-only 1, TSP-only 454, validator diagnostics 443, TSP diagnostics 14507 |
| Final full corpus in this worktree                                      | `f6b53f105b95da05276530a0754a1c71b4f16397`, generated `2026-09-04T12:31:44.576Z`, full run | Fired 5, TSP fired 458, overlap 4, validator-only 1, TSP-only 454, validator diagnostics 443, TSP diagnostics 14463 |

The old report and lintdiff report use different definitions: the old report credits aggregate local-lint coverage, while lintdiff counts same-project diagnostics over the successfully compiled TypeSpec corpus.

## Source-of-truth Swagger behavior

- Linter code: [XmsExamplesRequired](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/xms-examples-required.ts)
- Linter doc: [xms-examples-required.md](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/xms-examples-required.md)

The Swagger rule is registered in the shared `az-common` Spectral ruleset for `get`, `put`, `post`, `patch`, `delete`, `options`, and `head` path operations. It reports on the operation JSON path when the operation object lacks `x-ms-examples`. A shipped validator bug, `Object.keys(swaggerObj["x-ms-examples"].length > 0)`, makes any defined `x-ms-examples` value pass, including an empty object.

## Emission matrix

| Authored TypeSpec shape                                       | Emitter branch                      | OpenAPI field                                        | Swagger result                            | TypeSpec lint result                         | Fixture                |
| ------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- | ----------------------------------------- | -------------------------------------------- | ---------------------- |
| No `@extension` and no `@Autorest.example`                    | no in-program example branch        | absent unless external example loading adds one      | violation when absent                     | violation                                    | `missing-xms-examples` |
| `@extension("x-ms-examples", #{...})`                         | generic OpenAPI extension           | present with object                                  | clean                                     | clean                                        | `with-xms-examples`    |
| `@extension("x-ms-examples", #{})`                            | generic OpenAPI extension           | present with empty object                            | clean because of validator presence check | clean                                        | `empty-xms-examples`   |
| `@Autorest.example("./examples/getWidget.json", "getWidget")` | autorest decorator examples         | present as `{ "$ref": "./examples/getWidget.json" }` | clean                                     | clean                                        | `autorest-example`     |
| External example files discovered by `examples-dir`           | autorest async file loading/copying | may be present after emit                            | clean when present                        | unresolved; not used to suppress diagnostics | real-service corpus    |

## Focused fixture evidence

`validate --rule XmsExamplesRequired --update-snapshots` and a rerun without snapshot updates passed with 4 cases:

- `missing-xms-examples`: validator 1, TypeSpec 1.
- `with-xms-examples`: validator 0, TypeSpec 0.
- `empty-xms-examples`: validator 0, TypeSpec 0.
- `autorest-example`: validator 0, TypeSpec 0; emitted OpenAPI contains `"x-ms-examples": { "getWidget": { "$ref": "./examples/getWidget.json" } }`.

## Full corpus comparison

Corpus source: `f6b53f105b95da05276530a0754a1c71b4f16397`. Final run was full, not partial: 462/468 projects compiled and 6 were unassessed.

### Project sets

Validator projects:

- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkBookOperations`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/resources/resource-manager/Microsoft.Resources/subscriptions`
- `specification/web/resource-manager/Microsoft.Web/AppService`

Overlap:

- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/resources/resource-manager/Microsoft.Resources/subscriptions`
- `specification/web/resource-manager/Microsoft.Web/AppService`

Validator-only projects:

- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkBookOperations`

TypeSpec-only projects:

- `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`
- `specification/agricultureplatform/AgriculturePlatform.Management`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertProcessingRules`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertRuleRecommendations`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertsManagement`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/PreviewAlertRule`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/PrometheusRuleGroups`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/TenantActivityLogAlerts`
- `specification/apicenter/ApiCenter.Management`
- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/app/resource-manager/Microsoft.App/SreAgent`
- `specification/appcomplianceautomation/AppComplianceAutomation.Management`
- `specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/AnalyticsItems`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentAPIs`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentLinkedStorageAccountApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Components`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/DeletedWorkbookApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Favorites`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/LiveTokenApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WebTestLocation`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WebTestsApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbookTemplatesApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbooksApi`
- `specification/applink/AppLink.Management`
- `specification/attestation/resource-manager/Microsoft.Attestation/Attestation`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AttributeNamespaces`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/Authorization`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/ClassicAdmin`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/DenyAssignment`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/ProviderOperations`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/RoleAssignment`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/RoleDefinitions`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/RoleManagementAlerts`
- `specification/automation/Automation.Management`
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
- `specification/awsconnector/Ec2Instance.Management`
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
- `specification/awsconnector/EksCluster.Management`
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
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCI`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCIVM`
- `specification/batch/resource-manager/Microsoft.Batch/Batch`
- `specification/billing/resource-manager/Microsoft.Billing/Billing`
- `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
- `specification/billingtrust/resource-manager/Microsoft.BillingTrust/BillingTrust`
- `specification/botservice/resource-manager/Microsoft.BotService/BotService`
- `specification/carbon/resource-manager/Microsoft.Carbon/Carbon`
- `specification/cdn/resource-manager/Microsoft.Cdn/Cdn`
- `specification/cdn/resource-manager/Microsoft.Cdn/EdgeActions`
- `specification/certificateregistration/resource-manager/Microsoft.CertificateRegistration/CertificateRegistration`
- `specification/chaos/resource-manager/Microsoft.Chaos/Chaos`
- `specification/cloudhealth/resource-manager/Microsoft.CloudHealth/CloudHealth`
- `specification/codesigning/resource-manager/Microsoft.CodeSigning/CodeSigning`
- `specification/cognitiveservices/CognitiveServices.Management`
- `specification/commerce/resource-manager/Microsoft.Commerce/Commerce`
- `specification/communication/Communication.Management`
- `specification/communitytraining/resource-manager/Microsoft.Community/Community`
- `specification/compute/resource-manager/Microsoft.Compute/Bulkactions`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeDisk`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeGallery`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeSku`
- `specification/compute/resource-manager/Microsoft.Compute/Recommender`
- `specification/computebulkactions/ComputeBulkActions.Management`
- `specification/computelimit/resource-manager/Microsoft.ComputeLimit/ComputeLimit`
- `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`
- `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger`
- `specification/confluent/resource-manager/Microsoft.Confluent/Confluent`
- `specification/connectedcache/resource-manager/Microsoft.ConnectedCache/ConnectedCache`
- `specification/consumption/resource-manager/Microsoft.Consumption/Consumption`
- `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/Registry`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/RegistryTasks`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aimanager`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aks`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/deploymentsafeguards`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/fleet`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/nodecustomization`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/preparedimagespecification`
- `specification/containerstorage/resource-manager/Microsoft.ContainerStorage/ContainerStorage`
- `specification/contosowidgetmanager/Contoso.Management`
- `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`
- `specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement`
- `specification/dashboard/resource-manager/Microsoft.Dashboard/Dashboard`
- `specification/databasefleetmanager/resource-manager/Microsoft.DatabaseFleetManager/DatabaseFleetManager`
- `specification/databasewatcher/resource-manager/Microsoft.DatabaseWatcher/DatabaseWatcher`
- `specification/databox/resource-manager/Microsoft.DataBox/DataBox`
- `specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge`
- `specification/databricks/resource-manager/Microsoft.Databricks/Databricks`
- `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`
- `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`
- `specification/datamigration/resource-manager/Microsoft.DataMigration/DataMigration`
- `specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`
- `specification/dell/resource-manager/Dell.Storage/DellStorage`
- `specification/desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`
- `specification/devcenter/resource-manager/Microsoft.DevCenter/DevCenter`
- `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`
- `specification/deviceregistry/DeviceRegistry.Management`
- `specification/devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure`
- `specification/devtestlabs/resource-manager/Microsoft.DevTestLab/DevTestLabs`
- `specification/discovery/Discovery.Management`
- `specification/dns/resource-manager/Microsoft.Network/Dns`
- `specification/dnsresolver/resource-manager/Microsoft.Network/DnsResolver`
- `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`
- `specification/domainservices/resource-manager/Microsoft.AAD/DomainServices`
- `specification/durabletask/resource-manager/Microsoft.DurableTask/DurableTask`
- `specification/dynatrace/resource-manager/Dynatrace.Observability/DynatraceObservability`
- `specification/edge/resource-manager/Microsoft.Edge/configurationmanager`
- `specification/edge/resource-manager/Microsoft.Edge/configurations`
- `specification/edge/resource-manager/Microsoft.Edge/disconnectedOperations`
- `specification/edge/resource-manager/Microsoft.Edge/sites`
- `specification/edgemarketplace/Microsoft.EdgeMarketPlace.Management`
- `specification/edgeorder/resource-manager/Microsoft.EdgeOrder/EdgeOrder`
- `specification/edgezones/resource-manager/Microsoft.EdgeZones/EdgeZones`
- `specification/education/resource-manager/Microsoft.Education/Education`
- `specification/elastic/resource-manager/Microsoft.Elastic/Elastic`
- `specification/elasticsan/resource-manager/Microsoft.ElasticSan/ElasticSan`
- `specification/eventgrid/resource-manager/Microsoft.EventGrid/EventGrid`
- `specification/eventhub/resource-manager/Microsoft.EventHub/Eventhub`
- `specification/ews/resource-manager/Microsoft.SecretSyncController/SecretSyncController`
- `specification/extendedlocation/resource-manager/Microsoft.ExtendedLocation/CustomLocations`
- `specification/fabric/resource-manager/Microsoft.Fabric/Fabric`
- `specification/fileshares/resource-manager/Microsoft.FileShares/FileShares`
- `specification/fist/resource-manager/Microsoft.IoTFirmwareDefense/IoTFirmwareDefense`
- `specification/frontdoor/resource-manager/Microsoft.Network/FrontDoor`
- `specification/github-network/GitHub.Network.Management`
- `specification/guestconfiguration/resource-manager/Microsoft.GuestConfiguration/Assignments`
- `specification/hanaonazure/resource-manager/Microsoft.HanaOnAzure/HanaOnAzure`
- `specification/hardwaresecuritymodules/resource-manager/Microsoft.HardwareSecurityModules/HardwareSecurityModules`
- `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`
- `specification/healthbot/resource-manager/Microsoft.HealthBot/HealthBot`
- `specification/healthcareapis/resource-manager/Microsoft.HealthcareApis/HealthcareApis`
- `specification/healthdataaiservices/HealthDataAIServices.Management`
- `specification/help/resource-manager/Microsoft.Help/Help`
- `specification/horizondb/resource-manager/Microsoft.HorizonDb/HorizonDb`
- `specification/hybridaks/resource-manager/Microsoft.HybridContainerService/HybridContainerService`
- `specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute`
- `specification/hybridconnectivity/HybridConnectivity.Management`
- `specification/hybridkubernetes/resource-manager/Microsoft.Kubernetes/HybridKubernetes`
- `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`
- `specification/impact/Impact.Management`
- `specification/informatica/resource-manager/Informatica.DataManagement/Informatica`
- `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`
- `specification/iotoperations/resource-manager/Microsoft.IoTOperations/IoTOperations`
- `specification/iotoperationsdataprocessor/IoTOperationsDataProcessor.Management`
- `specification/iotoperationsmq/IoTOperationsMQ.Management`
- `specification/iotoperationsorchestrator/IoTOperationsOrchestrator.Management`
- `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/extensionTypes`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/extensions`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/kubernetesResources`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/operations`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/privateLinkScopes`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/upgradeAssessments`
- `specification/kubernetesruntime/resource-manager/Microsoft.KubernetesRuntime/KubernetesRuntime`
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
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/maintenance/resource-manager/Microsoft.Maintenance/Maintenance`
- `specification/managednetworkfabric/resource-manager/Microsoft.ManagedNetworkFabric/ManagedNetworkFabric`
- `specification/managedoperations/ManagedOps.Management`
- `specification/management/resource-manager/Microsoft.Management/ManagementGroups`
- `specification/management/resource-manager/Microsoft.Management/ServiceGroups`
- `specification/manufacturingplatform/Manufacturingplatform.Management`
- `specification/maps/resource-manager/Microsoft.Maps/Maps`
- `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace`
- `specification/marketplacecatalog/resource-manager/Microsoft.Marketplace/Products`
- `specification/marketplacecatalog/resource-manager/Microsoft.Marketplace/Reviews`
- `specification/marketplacecatalog/resource-manager/Microsoft.Marketplace/Skus`
- `specification/migrate/resource-manager/Microsoft.Migrate/AKSAssessments`
- `specification/migrate/resource-manager/Microsoft.Migrate/AssessmentProjects`
- `specification/migrate/resource-manager/Microsoft.Migrate/AvsAssessments`
- `specification/migrate/resource-manager/Microsoft.Migrate/BusinessCases`
- `specification/migrate/resource-manager/Microsoft.Migrate/Collectors`
- `specification/migrate/resource-manager/Microsoft.Migrate/HeterogenousAssessments`
- `specification/migrate/resource-manager/Microsoft.Migrate/MachineAssessments`
- `specification/migrate/resource-manager/Microsoft.Migrate/SqlAssessments`
- `specification/migrate/resource-manager/Microsoft.Migrate/Waves`
- `specification/migrate/resource-manager/Microsoft.Migrate/WebAppAssessments`
- `specification/migrate/resource-manager/Microsoft.Migrate/WebAppCompoundAssessments`
- `specification/migrate/resource-manager/Microsoft.OffAzure/OffAzure`
- `specification/mission/resource-manager/Microsoft.Mission/Mission`
- `specification/mongocluster/resource-manager/Microsoft.DocumentDB/MongoCluster`
- `specification/monitor/resource-manager/Microsoft.Insights/DataCollectionRuleConfigurationMetadata`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActionGroupsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActivityLogAlertsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActivityLogsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/AlertRulesIncidentsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/AutoScaleApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/DataCollectionApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/DiagnosticsSettings`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/LogProfilesApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/MetricAlertApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/MetricBaselinesApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/MetricsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/NetworkSecurityPerimeterApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/PrivateLinkScopesApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ScheduledQueryRuleApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ServiceDiagnosticsSettingsApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/VmInsightsOnboarding`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Agents`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/PipelineGroups`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Slis`
- `specification/msi/resource-manager/Microsoft.ManagedIdentity/ManagedIdentity`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/napster/Napster.CompanionAPI.Management`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/network/resource-manager/Microsoft.Network/Network/Vmss`
- `specification/networkcloud/resource-manager/Microsoft.NetworkCloud/NetworkCloud`
- `specification/networkfunction/resource-manager/Microsoft.NetworkFunction/TrafficCollector`
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
- `specification/policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyInsightsApi`
- `specification/policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyTrackedResourcesApi`
- `specification/portal/Dashboard.Management`
- `specification/portal/TenantConfiguration.Management`
- `specification/portalservices/CopilotSettings.Management`
- `specification/portalservices/Extension.Management`
- `specification/postgresql/DBforPostgreSQL.Management`
- `specification/postgresqlhsc/resource-manager/Microsoft.DBforPostgreSQL/PostgresqlHsc`
- `specification/powerbidedicated/resource-manager/Microsoft.PowerBIdedicated/PowerBIDedicated`
- `specification/powerplatform/resource-manager/Microsoft.PowerPlatform/PowerPlatform`
- `specification/privatedns/resource-manager/Microsoft.Network/PrivateDns`
- `specification/programenrollment/resource-manager/Microsoft.ProgramEnrollment/ProgramEnrollment`
- `specification/programmableconnectivity/ProgrammableConnectivity.Management`
- `specification/providerhub/ProviderHub.Management`
- `specification/purestorage/resource-manager/PureStorage.Block/PureStorageBlock`
- `specification/purview/resource-manager/Microsoft.Purview/Purview`
- `specification/purviewpolicy/resource-manager/Microsoft.Purview/PurviewPolicy`
- `specification/quantum/resource-manager/Microsoft.Quantum/Quantum`
- `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
- `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup`
- `specification/recoveryservicesdatareplication/resource-manager/Microsoft.DataReplication/DataReplication`
- `specification/recoveryservicessiterecovery/resource-manager/Microsoft.RecoveryServices/SiteRecovery`
- `specification/redhatopenshift/resource-manager/Microsoft.RedHatOpenShift/OpenShiftClusters`
- `specification/redis/resource-manager/Microsoft.Cache/Redis`
- `specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise`
- `specification/relationships/resource-manager/Microsoft.Relationships/Relationships`
- `specification/relay/resource-manager/Microsoft.Relay/Relay`
- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Quota`
- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`
- `specification/resourceconnector/resource-manager/Microsoft.ResourceConnector/ResourceConnector`
- `specification/resourcegraph/resource-manager/Microsoft.ResourceGraph/ResourceGraph/GraphQueryApi`
- `specification/resourcegraph/resource-manager/Microsoft.ResourceGraph/ResourceGraph/ResourceChanges`
- `specification/resourcegraph/resource-manager/Microsoft.ResourceGraph/ResourceGraph/ResourceGraphApi`
- `specification/resourcegraph/resource-manager/Microsoft.ResourceGraph/ResourceGraph/ResourceHistory`
- `specification/resourcehealth/resource-manager/Microsoft.ResourceHealth/ResourceHealth`
- `specification/resources/resource-manager/Microsoft.Authorization/policy`
- `specification/resources/resource-manager/Microsoft.Resources/bicep`
- `specification/resources/resource-manager/Microsoft.Resources/databoundaries`
- `specification/resources/resource-manager/Microsoft.Resources/deploymentScripts`
- `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks`
- `specification/resources/resource-manager/Microsoft.Resources/resourceValidator`
- `specification/scvmm/ScVmm.Management`
- `specification/search/resource-manager/Microsoft.Search/Search`
- `specification/security/resource-manager/Microsoft.Security/Security/ATPSettingsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/AlertsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/AlertsSuppressionRulesAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/ApiCollectionsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/ApplicationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/AssessmentAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/AutomationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/ComplianceResultsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/DataScannersAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/DefenderForStorageAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/GovernanceAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/HealthReportsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/IoTSecurityAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/LegacySettingsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/LocationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/MdeOnboardingAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/OperationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/PricingsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/PrivateLinksAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/RegulatoryComplianceAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecureScoreAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecurityConnectorsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecurityConnectorsDevOpsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecurityOperatorsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecuritySolutionsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecurityStandardsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SensitivitySettingsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/ServerVulnerabilityAssessmentsSettingsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SettingsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SqlVulnerabilityAssessmentsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/StandardsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SubAssessmentsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/TasksAPI`
- `specification/securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights`
- `specification/serialconsole/resource-manager/Microsoft.SerialConsole/SerialConsole`
- `specification/servicebus/resource-manager/Microsoft.ServiceBus/ServiceBus`
- `specification/servicefabric/resource-manager/Microsoft.ServiceFabric/ServiceFabric`
- `specification/servicefabricmanagedclusters/resource-manager/Microsoft.ServiceFabric/ServiceFabricManagedClusters`
- `specification/servicenetworking/resource-manager/Microsoft.ServiceNetworking/ServiceNetworking`
- `specification/signalr/resource-manager/Microsoft.SignalRService/SignalRService`
- `specification/solutions/Solutions.Management`
- `specification/sovereign/resource-manager/Microsoft.Sovereign/Sovereign`
- `specification/sphere/resource-manager/Microsoft.AzureSphere/AzureSphere`
- `specification/splitio/SplitIO.Experimentation.Management`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/sqlvirtualmachine/resource-manager/Microsoft.SqlVirtualMachine/SqlVirtualMachine`
- `specification/standbypool/resource-manager/Microsoft.StandbyPool/StandbyPool`
- `specification/storage/Storage.Management`
- `specification/storageactions/resource-manager/Microsoft.StorageActions/StorageActions`
- `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`
- `specification/storagediscovery/resource-manager/Microsoft.StorageDiscovery/StorageDiscovery`
- `specification/storagemover/resource-manager/Microsoft.StorageMover/StorageMover`
- `specification/storagesync/resource-manager/Microsoft.StorageSync/StorageSync`
- `specification/subscription/resource-manager/Microsoft.Subscription/Subscription`
- `specification/support/resource-manager/Microsoft.Support/Support`
- `specification/terraform/resource-manager/Microsoft.AzureTerraform/AzureTerraform`
- `specification/trafficmanager/resource-manager/Microsoft.Network/TrafficManager`
- `specification/verifiedid/resource-manager/Microsoft.VerifiedId/VerifiedId`
- `specification/vmware/resource-manager/Microsoft.AVS/AVS`
- `specification/webpubsub/resource-manager/Microsoft.SignalRService/SignalRService`
- `specification/widget/resource-manager/Microsoft.Widget/Widget`
- `specification/workloads/Workloads.SAPDiscoverySite.Management`
- `specification/workloads/Workloads.SAPMonitor.Management`
- `specification/workloads/Workloads.SAPVirtualInstance.Management`

Unassessed compile failures:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

### Diagnostic totals

- Raw validator diagnostics: 443
- Raw TypeSpec diagnostics: 14463
- Normalized/deduplicated cross-engine identity: not available for this rule; Swagger reports emitted operation JSON paths and TypeSpec reports semantic operation declarations.
- Observed project overlap: 4/5 validator projects (80%).

## Gap examples

### Gap example: @Autorest.example false positive

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `autorest-example/main.tsp`

**TypeSpec source**

```typespec
@Autorest.example("./examples/getWidget.json", "getWidget")
@get
op getWidget(@path name: string): Widget;
```

**Emitted OpenAPI or validator behavior**

```json
"x-ms-examples": {
  "getWidget": {
    "$ref": "./examples/getWidget.json"
  }
}
```

| Engine            | Observed result                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Swagger validator | No diagnostic because `x-ms-examples` is present.                                                      |
| TypeSpec lint     | No diagnostic after this fix because `getExamples(program, operation)` returns the decorator metadata. |

**Explanation:** The previous TypeSpec rule only checked `@extension("x-ms-examples", ...)` metadata and ignored the autorest decorator that emits the same OpenAPI field.

**Disposition:** Rule fix.

### Gap example: external examples remain TypeSpec-only

- **Classification:** TypeSpec-only
- **Status:** unresolved
- **Project/API version:** `specification/advisor/resource-manager/Microsoft.Advisor/Advisor` / `2026-03-01-preview`
- **Source:** `typespec/examples/2026-03-01-preview/OperationsList.json`

**TypeSpec source**

```json
{
  "operationId": "Operations_List",
  "title": "OperationsList"
}
```

**Emitted OpenAPI or validator behavior**

```json
"x-ms-examples": {
  "OperationsList": {
    "$ref": "./examples/OperationsList.json"
  }
}
```

| Engine            | Observed result                                                                 |
| ----------------- | ------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic because emitted OpenAPI contains `x-ms-examples`.                 |
| TypeSpec lint     | Still may report when no in-program `@extension` or `@Autorest.example` exists. |

**Explanation:** External examples are resolved by emitter options and version-specific filesystem state. A previous attempted implementation scanned `projectRoot/examples`, but independent review found that it could suppress diagnostics using examples from the wrong version or miss custom `examples-dir` locations. That unsafe approach was removed.

**Disposition:** Remaining investigation; requires exact emitter examples-dir/version modeling or an emitter-time check.

### Gap example: provider operations template validator-only

- **Classification:** validator-only
- **Status:** unresolved comparison gap
- **Project/API version:** `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkBookOperations` / `2021-03-08`
- **Source:** `main.tsp` interface `Operations extends Azure.ResourceManager.Legacy.Operations<...>`

**TypeSpec source**

```typespec
interface Operations
  extends Azure.ResourceManager.Legacy.Operations<OperationListResult, ErrorResponse> {}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {
    "/providers/Microsoft.Insights/operations": {
      "get": {
        "operationId": "Operations_List"
      }
    }
  }
}
```

| Engine            | Observed result                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| Swagger validator | Reports `XmsExamplesRequired` because the emitted operation lacks `x-ms-examples`. |
| TypeSpec lint     | No diagnostic observed in the corpus result.                                       |

**Explanation:** This provider-operations path is produced through an ARM legacy template shape where the corpus did not surface a comparable TypeSpec operation diagnostic for this rule.

**Disposition:** Remaining investigation; outside the `@Autorest.example` false-positive fix.

## Final assessment

This PR improves semantic fidelity for an emitted in-program example branch and documents the remaining comparison limitations. The migrated rule is not universally functionally equal to the Swagger validator across the full corpus: external example-file loading and provider-operation template cases remain visible as one-sided gaps. Raw diagnostic equality is not required, and the remaining count differences are intentionally preserved for future rule work.
