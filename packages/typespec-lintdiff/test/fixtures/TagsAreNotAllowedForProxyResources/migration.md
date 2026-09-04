# Migration analysis: TagsAreNotAllowedForProxyResources

## Conclusion

**TypeSpec rule update required and completed.** The prior implementation checked only a proxy
resource's properties model. The Swagger rule also checks `definition.properties.tags`, so an
authorable `tags` property added directly to a `ProxyResource` envelope was missed. The migrated
rule now checks both the resource envelope and its properties model, including inherited
properties, and reports on the authored `tags` property.

The migrated rule is functionally equivalent to the documented ARM requirement for authorable
TypeSpec proxy resources. It intentionally does not reproduce the staging Swagger implementation's
false positives on arbitrary definitions, tracked-resource update envelopes, and nested non-resource
models. Raw diagnostic equality is neither expected nor desirable.

## Sources and population

- External report: [`docs/coverage_old.md`](../../../docs/coverage_old.md), 450 compiled projects
  and 210 validator rules. It records 313 validator projects, 16 local-lint projects, no official
  projects, and 5.1% aggregate coverage. It does not retain per-project diagnostics.
- Reproduced report: a local full run at specs commit
  `f6b53f105b95da05276530a0754a1c71b4f16397` compiled 462/468 projects on
  2026-09-05 and evaluated this `stagingOnly` validator rule explicitly. It was generated with
  `specs:typespec --specs-repo <pinned-worktree> --concurrency 6`, followed by
  `specs:staging <dataset> TagsAreNotAllowedForProxyResources` and
  `specs:coverage --specs-repo <pinned-worktree>`. Per the rule-development workflow, generated
  [`specs`](../../../specs/) artifacts were restored before the PR; the complete reproduced row and
  project sets are retained below rather than presented as the older checked-in canonical report.
- Validator source: Azure/azure-openapi-validator commit
  `1198225afecbb818c3050d4d2a91da92e14e56ce`,
  [function](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/tags-are-not-allowed-for-proxy-resources.ts),
  [rule registration](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/az-arm.ts#L770-L782),
  and [documentation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/tags-are-not-allowed-for-proxy-resources.md).
- The normal production corpus has zero findings because the validator rule is `stagingOnly`.
  The explicit staging run scanned the same retained Swagger corpus. TypeSpec linting ran on source
  programs, with the runner's selected-version projection/filtering.

| Report/mode                 | Validator projects | TypeSpec projects |      Overlap | Validator-only | TypeSpec-only | Raw validator diagnostics | Raw TypeSpec diagnostics |
| --------------------------- | -----------------: | ----------------: | -----------: | -------------: | ------------: | ------------------------: | -----------------------: |
| External aggregate          |                313 |                16 | not retained |   not retained |  not retained |              not retained |             not retained |
| Reproduced production       |                  0 |                22 |            0 |              0 |            22 |                         0 |                      109 |
| Reproduced staging, aligned |                319 |                22 |           22 |            297 |             0 |                       892 |                      109 |

The external 313/16 row and reproduced 319/22 row differ because the reports use different specs
snapshots and compiled populations. The production/staging difference is execution policy, not rule
behavior. The additional TypeSpec diagnostics after this change are the newly covered proxy
resource-envelope shape.

## Project-set comparison

### Same-project overlap (22)

- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration`
- `specification/batch/resource-manager/Microsoft.Batch/Batch`
- `specification/billing/resource-manager/Microsoft.Billing/Billing`
- `specification/cloudhealth/resource-manager/Microsoft.CloudHealth/CloudHealth`
- `specification/cognitiveservices/CognitiveServices.Management`
- `specification/consumption/resource-manager/Microsoft.Consumption/Consumption`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aks`
- `specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`
- `specification/devcenter/resource-manager/Microsoft.DevCenter/DevCenter`
- `specification/deviceregistry/DeviceRegistry.Management`
- `specification/eventgrid/resource-manager/Microsoft.EventGrid/EventGrid`
- `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`
- `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/management/resource-manager/Microsoft.Management/ServiceGroups`
- `specification/migrate/resource-manager/Microsoft.OffAzure/OffAzure`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`
- `specification/security/resource-manager/Microsoft.Security/Security/IoTSecurityAPI`
- `specification/sovereign/resource-manager/Microsoft.Sovereign/Sovereign`
- `specification/subscription/resource-manager/Microsoft.Subscription/Subscription`

### Validator-only (297)

- `specification/agricultureplatform/AgriculturePlatform.Management`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertProcessingRules`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/PrometheusRuleGroups`
- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/TenantActivityLogAlerts`
- `specification/apicenter/ApiCenter.Management`
- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/app/resource-manager/Microsoft.App/SreAgent`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Components`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/DeletedWorkbookApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WebTestsApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbookTemplatesApi`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbooksApi`
- `specification/applink/AppLink.Management`
- `specification/attestation/resource-manager/Microsoft.Attestation/Attestation`
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
- `specification/azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData`
- `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer`
- `specification/azuredependencymap/resource-manager/Microsoft.DependencyMap/DependencyMap`
- `specification/azurefleet/resource-manager/Microsoft.AzureFleet/AzureFleet`
- `specification/azurelargeinstance/resource-manager/Microsoft.AzureLargeInstance/AzureLargeInstance`
- `specification/azureresiliencemanagement/resource-manager/Microsoft.AzureResilienceManagement/AzureResilienceManagement`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCI`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCIVM`
- `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
- `specification/cdn/resource-manager/Microsoft.Cdn/Cdn`
- `specification/cdn/resource-manager/Microsoft.Cdn/EdgeActions`
- `specification/chaos/resource-manager/Microsoft.Chaos/Chaos`
- `specification/codesigning/resource-manager/Microsoft.CodeSigning/CodeSigning`
- `specification/communication/Communication.Management`
- `specification/communitytraining/resource-manager/Microsoft.Community/Community`
- `specification/compute/resource-manager/Microsoft.Compute/Bulkactions`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeDisk`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeGallery`
- `specification/computebulkactions/ComputeBulkActions.Management`
- `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`
- `specification/confluent/resource-manager/Microsoft.Confluent/Confluent`
- `specification/connectedcache/resource-manager/Microsoft.ConnectedCache/ConnectedCache`
- `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/Registry`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/RegistryTasks`
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aimanager`
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
- `specification/dell/resource-manager/Dell.Storage/DellStorage`
- `specification/desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`
- `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`
- `specification/devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure`
- `specification/devtestlabs/resource-manager/Microsoft.DevTestLab/DevTestLabs`
- `specification/discovery/Discovery.Management`
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
- `specification/ews/resource-manager/Microsoft.SecretSyncController/SecretSyncController`
- `specification/extendedlocation/resource-manager/Microsoft.ExtendedLocation/CustomLocations`
- `specification/fabric/resource-manager/Microsoft.Fabric/Fabric`
- `specification/fileshares/resource-manager/Microsoft.FileShares/FileShares`
- `specification/fist/resource-manager/Microsoft.IoTFirmwareDefense/IoTFirmwareDefense`
- `specification/frontdoor/resource-manager/Microsoft.Network/FrontDoor`
- `specification/github-network/GitHub.Network.Management`
- `specification/hanaonazure/resource-manager/Microsoft.HanaOnAzure/HanaOnAzure`
- `specification/hardwaresecuritymodules/resource-manager/Microsoft.HardwareSecurityModules/HardwareSecurityModules`
- `specification/healthcareapis/resource-manager/Microsoft.HealthcareApis/HealthcareApis`
- `specification/healthdataaiservices/HealthDataAIServices.Management`
- `specification/horizondb/resource-manager/Microsoft.HorizonDb/HorizonDb`
- `specification/hybridaks/resource-manager/Microsoft.HybridContainerService/HybridContainerService`
- `specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute`
- `specification/hybridconnectivity/HybridConnectivity.Management`
- `specification/hybridkubernetes/resource-manager/Microsoft.Kubernetes/HybridKubernetes`
- `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`
- `specification/informatica/resource-manager/Informatica.DataManagement/Informatica`
- `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`
- `specification/iotoperations/resource-manager/Microsoft.IoTOperations/IoTOperations`
- `specification/iotoperationsdataprocessor/IoTOperationsDataProcessor.Management`
- `specification/iotoperationsmq/IoTOperationsMQ.Management`
- `specification/iotoperationsorchestrator/IoTOperationsOrchestrator.Management`
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
- `specification/maintenance/resource-manager/Microsoft.Maintenance/Maintenance`
- `specification/managednetworkfabric/resource-manager/Microsoft.ManagedNetworkFabric/ManagedNetworkFabric`
- `specification/manufacturingplatform/Manufacturingplatform.Management`
- `specification/maps/resource-manager/Microsoft.Maps/Maps`
- `specification/migrate/resource-manager/Microsoft.Migrate/AssessmentProjects`
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
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ServiceDiagnosticsSettingsApi`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Agents`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/PipelineGroups`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/napster/Napster.CompanionAPI.Management`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/networkcloud/resource-manager/Microsoft.NetworkCloud/NetworkCloud`
- `specification/networkfunction/resource-manager/Microsoft.NetworkFunction/TrafficCollector`
- `specification/newrelic/NewRelicObservability.Management`
- `specification/notificationhubs/resource-manager/Microsoft.NotificationHubs/NotificationHubs`
- `specification/onlineexperimentation/OnlineExperimentation.Management`
- `specification/oracle/resource-manager/Oracle.Database/OracleDatabase`
- `specification/orbitalplanetarycomputer/Orbital.Management`
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
- `specification/recoveryservicesdatareplication/resource-manager/Microsoft.DataReplication/DataReplication`
- `specification/recoveryservicessiterecovery/resource-manager/Microsoft.RecoveryServices/SiteRecovery`
- `specification/redhatopenshift/resource-manager/Microsoft.RedHatOpenShift/OpenShiftClusters`
- `specification/redis/resource-manager/Microsoft.Cache/Redis`
- `specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise`
- `specification/relay/resource-manager/Microsoft.Relay/Relay`
- `specification/resourceconnector/resource-manager/Microsoft.ResourceConnector/ResourceConnector`
- `specification/resourcegraph/resource-manager/Microsoft.ResourceGraph/ResourceGraph/GraphQueryApi`
- `specification/resources/resource-manager/Microsoft.Resources/deploymentScripts`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/resources/resource-manager/Microsoft.Resources/subscriptions`
- `specification/scvmm/ScVmm.Management`
- `specification/security/resource-manager/Microsoft.Security/Security/AutomationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/PrivateLinksAPI`
- `specification/servicefabric/resource-manager/Microsoft.ServiceFabric/ServiceFabric`
- `specification/servicefabricmanagedclusters/resource-manager/Microsoft.ServiceFabric/ServiceFabricManagedClusters`
- `specification/servicenetworking/resource-manager/Microsoft.ServiceNetworking/ServiceNetworking`
- `specification/solutions/Solutions.Management`
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
- `specification/verifiedid/resource-manager/Microsoft.VerifiedId/VerifiedId`
- `specification/vmware/resource-manager/Microsoft.AVS/AVS`
- `specification/web/resource-manager/Microsoft.Web/AppService`
- `specification/widget/resource-manager/Microsoft.Widget/Widget`
- `specification/workloads/Workloads.SAPDiscoverySite.Management`
- `specification/workloads/Workloads.SAPMonitor.Management`
- `specification/workloads/Workloads.SAPVirtualInstance.Management`

### TypeSpec-only (0)

- None.

There are no TypeSpec-only projects in the aligned staging comparison. Projection to the selected
\`2025-10-03-preview\` version excludes four unprojected diagnostics from
\`specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts\`: its health-model
operations are removed at \`Versions.v2025_10_03\`, so the corresponding proxy property bags do not
reach the selected HTTP service. The selected-version TypeSpec population is 109 diagnostics.

### Gap example: removed health-model operations

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/monitoringservice/resource-manager/Microsoft.Monitor/Accounts` /
  `2025-10-03-preview`
- **Source:** `typespec/healthmodels/healthmodels.tsp:102`

**TypeSpec versioning source**

```typespec
@armResourceOperations(HealthModel)
@removed(Versions.v2025_10_03)
interface HealthModels {
  get is ArmResourceRead<HealthModel>;
}
```

| Engine            | Observed result                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Swagger validator | No selected-version comparison exists for the removed health-model operations.                        |
| TypeSpec lint     | Four diagnostics in the unprojected program; none after `http-reachable` selected-version projection. |

**Explanation:** The health-model proxy resources and their `tags` properties remain declarations in
the source program, but their operations are removed at the selected version and therefore are not
HTTP-reachable in the emitted Swagger population.

**Disposition:** Exclude the four older-version-only diagnostics through the rule's
`projectionScope: http-reachable` comparison metadata; do not weaken the production lint.

## Compile failures

The full TypeSpec run compiled 462 of 468 projects. These six failures were excluded from both sides
of the behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

Staging validator findings existed in 3 excluded projects:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`

The staging shard contains 900 raw diagnostics across 322 projects before this alignment; the
aligned report contains 892 across 319 projects. These failures do not conceal a TypeSpec-only
finding, but they remain population uncertainty rather than evidence of equivalence for those
projects.

## Diagnostic cardinality

| Identity                                                        | Count |
| --------------------------------------------------------------- | ----: |
| Validator raw: project + Swagger file + JSON path               |   892 |
| Validator deduplicated: project + Swagger file + JSON path      |   892 |
| Validator file-independent: project + JSON path                 |   892 |
| TypeSpec raw                                                    |   109 |
| TypeSpec source identity: project + source file + line + column |    86 |

The identities are intentionally not equated. Swagger visits emitted definition occurrences;
TypeSpec reports authored semantic properties. Template instantiation and multiple resource models
can map several semantic resources to one source location, while Swagger update schemas add
additional emitted occurrences.

## Emission matrix and fixture evidence

| Authored TypeSpec shape                               | Emitter/result branch                                          | Selected OpenAPI field                       | Swagger        | TypeSpec  | Fixture                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------- | -------------- | --------- | ----------------------------------------------------------------------------- |
| Proxy resource with `tags` on envelope                | ARM resource model definition                                  | `properties.tags`, no sibling `location`     | violation      | violation | `proxy-with-envelope-tags`                                                    |
| Proxy properties model with direct/inherited `tags`   | Resource `properties` schema and emitted properties definition | nested or definition-level `properties.tags` | violation      | violation | `proxy-with-tags`                                                             |
| Proxy resource without `tags`                         | Proxy resource template                                        | no `tags` field                              | clean          | clean     | `proxy-without-tags`                                                          |
| Tracked resource's supported tags                     | Tracked resource template                                      | `properties.tags` with sibling `location`    | clean          | clean     | `tracked-with-tags`                                                           |
| Tracked update envelope                               | ARM update-model generation                                    | `properties.tags` without `location`         | false positive | clean     | pinned corpus example below                                                   |
| Arbitrary nested/non-resource model containing `tags` | Generic model emission                                         | definition or nested `properties.tags`       | false positive | clean     | upstream validator test `ActionGroupPatchBody`/`ManagedServiceIdentity` cases |

Focused validation passed all four fixtures: two violations and two reviewed compliant controls.
The existing properties-bag fixture emits three Swagger findings because the validator also flags
generated tracked update definitions; one semantic TypeSpec diagnostic correctly identifies the
authored proxy violation. The final two matrix rows document validator defects rather than intended
equivalence branches: the tracked-update row is executable in the pinned AgriculturePlatform corpus,
and the arbitrary-model row is executable in the upstream validator test's
`ActionGroupPatchBody`/`ManagedServiceIdentity` cases. Adding either as a harness compliance fixture
would deliberately make the equivalence harness fail because the Swagger implementation reports the
known false positive; these rows therefore use their executable source evidence instead.

### Gap example: tracked update schema is mistaken for a proxy resource

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** `specification/agricultureplatform/AgriculturePlatform.Management` /
  `2024-06-01-preview`
- **Source:** `main.tsp:30`, `AgriServiceResource`

**TypeSpec source**

```typespec
model AgriServiceResource is TrackedResource<AgriServiceResourceProperties> {
  ...ManagedServiceIdentityProperty;
  ...ResourceSkuProperty;
}
```

**Emitted OpenAPI**

```json
"AgriServiceResourceUpdate": {
  "properties": {
    "tags": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "properties": {
      "$ref": "#/definitions/AgriServiceResourceUpdateProperties"
    }
  }
}
```

| Engine            | Observed result                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Diagnostic at `definitions.AgriServiceResourceUpdate.properties.tags` because the generated update schema has no `location`. |
| TypeSpec lint     | No diagnostic: the registered resource is tracked, not proxy.                                                                |

**Explanation:** The Swagger function infers “proxy” solely from the absence of a sibling
`location`; update envelopes intentionally omit `location`, so tracked updates are
misclassified.

**Disposition:** Do not copy this false positive into the semantic TypeSpec rule.

### Gap example: arbitrary model is mistaken for a proxy resource

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** upstream validator unit test / not applicable
- **Source:** [`tags-are-not-allowed-for-proxy-resources.test.ts`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/test/tags-are-not-allowed-for-proxy-resources.test.ts)

**Swagger test input**

```json
"ManagedServiceIdentity": {
  "type": "object",
  "properties": {
    "tags": {
      "readOnly": true,
      "format": "uuid",
      "type": "string"
    },
    "tenantId": {
      "readOnly": true,
      "format": "uuid",
      "type": "string"
    }
  }
}
```

| Engine            | Observed result                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | The pinned upstream test expects a diagnostic at `definitions.ManagedServiceIdentity.properties.tags`.                   |
| TypeSpec lint     | No diagnostic for an arbitrary model; only models registered by `getArmResources()` with `kind === "Proxy"` are checked. |

**Explanation:** The Swagger function treats any definition with `tags` and no sibling `location`
as proxy-shaped. It does not establish that the definition is an ARM resource.

**Disposition:** Preserve semantic resource classification and do not reproduce the validator's
arbitrary-model false positive.

### Gap example: authored proxy properties tags

- **Classification:** count-only
- **Status:** fixed
- **Project/API version:** `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement` /
  `2025-09-01-preview`
- **Source:** `NamedValueContract.tsp:18` and `models.tsp:7726`

**TypeSpec source**

```typespec
model NamedValueContract is ProxyResource<NamedValueContractProperties>;
model NamedValueContractProperties extends NamedValueEntityBaseParameters {}
model NamedValueEntityBaseParameters {
  tags?: string[];
}
```

**Emitted/validator behavior**

```json
{
  "definition": "NamedValueContractProperties",
  "selectedProperty": "tags"
}
```

| Engine            | Observed result                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports emitted definition and nested occurrences.                                                    |
| TypeSpec lint     | Reports the inherited authored `tags` property once for each registered proxy resource using the bag. |

**Explanation:** Emitted-occurrence cardinality differs from semantic resource cardinality. Both
engines reject the authorable proxy-resource behavior.

**Disposition:** The hierarchy lookup is retained; no occurrence-count normalization is added.

## Required changes

- Check the registered proxy resource model itself for an authored or inherited `tags` property.
- Retain the properties-model hierarchy check.
- Add envelope violation, properties-bag violation, tag-free proxy, and tracked-resource controls.
- Target diagnostics at the offending authored property and avoid reproducing Swagger's
  name/location heuristic.
