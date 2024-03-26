import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-resource-manager";

namespace Dynatrace.Observability;

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@doc("A virtual machine reference")
@pattern("\\/subscriptions\\/[a-z0-9\\-]+\\/resourceGroups\\/[^\\/]+\\/providers\\/Microsoft\\.Compute\\/virtualMachines\\/[^\\/]+")
scalar virtualMachineId extends string;

@doc("Reusable representation of an email address")
@pattern("^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\\.)+[A-Za-z]{2,}$")
scalar email extends string;

@doc("Shorthand for setting length limit.")
@maxLength(50)
scalar MediumString extends string;

@doc("Credential string.")
@secret
scalar SecureString extends string;

@doc("Indicates whether metrics are being sent.")
union SendingMetricsStatus {
  string,

  @doc("Metrics are enabled.")
  Enabled: "Enabled",

  @doc("Metrics are disabled.")
  Disabled: "Disabled",
}

@doc("Indicates whether logs are being sent.")
union SendingLogsStatus {
  string,

  @doc("Logs are enabled.")
  Enabled: "Enabled",

  @doc("Logs are disabled.")
  Disabled: "Disabled",
}

@doc("Indicates whether AAD logs are being sent.")
union SendAadLogsStatus {
  string,

  @doc("AAD logs are enabled.")
  Enabled: "Enabled",

  @doc("AAD logs are disabled.")
  Disabled: "Disabled",
}

@doc("Indicates whether activity logs are being sent.")
union SendActivityLogsStatus {
  string,

  @doc("Activity logs are enabled.")
  Enabled: "Enabled",

  @doc("Activity logs are disabled.")
  Disabled: "Disabled",
}

@doc("Indicates whether subscription logs are being sent.")
union SendSubscriptionLogsStatus {
  string,

  @doc("Subscription logs are enabled.")
  Enabled: "Enabled",

  @doc("Subscription logs are disabled.")
  Disabled: "Disabled",
}

// Why is this not represented as a subResource? How are monitored resources added?
//MonitorResource and MontitoredResource are really close together as names, and may cause confusion
// perhaps ObservedResource
@doc("Details of resource being monitored by Dynatrace monitor resource")
model MonitoredResource {
  @doc("The Resource id of the resource.")
  id?: string;

  @doc("Flag indicating if resource is sending metrics to Dynatrace.")
  sendingMetrics?: SendingMetricsStatus;

  @added(Versions.`2022-04-30-preview`)
  @doc("Reason for why the resource is sending metrics (or why it is not sending).")
  reasonForMetricsStatus?: string;

  @doc("Flag indicating if resource is sending logs to Dynatrace.")
  sendingLogs?: SendingLogsStatus;

  @added(Versions.`2022-04-30-preview`)
  @doc("Reason for why the resource is sending logs (or why it is not sending).")
  reasonForLogsStatus?: string;
}

@doc("List of all the resources being monitored by Dynatrace monitor resource")
model MonitoredResourceListResponse extends Azure.Core.Page<MonitoredResource> {}

@doc("Properties specific to the monitor resource.")
model MonitorProperties {
  @doc("Status of the monitor.")
  monitoringStatus?: MonitoringStatus;

  @doc("Marketplace subscription status.")
  marketplaceSubscriptionStatus?: MarketplaceSubscriptionStatus;

  @doc("Properties of the Dynatrace environment.")
  dynatraceEnvironmentProperties?: DynatraceEnvironmentProperties;

  #suppress "@azure-tools/typespec-providerhub/non-breaking-versioning" "This is a preview api-version"
  @removed(Versions.`2022-04-30-preview`)
  @doc("User info.")
  userInfo?: UserInfo;

  @doc("Billing plan information.")
  planData?: PlanData;

  @visibility("read")
  @doc("Liftr Resource category.")
  liftrResourceCategory?: LiftrResourceCategories;

  @visibility("read")
  @doc("The priority of the resource.")
  liftrResourcePreference?: int32;

  @visibility("read")
  @doc("Provisioning state of the resource.")
  provisioningState?: ProvisioningState;

  @doc("A foo")
  @added(Versions.`2022-04-30-preview`)
  foo?: string;
}

@doc("An artificial model for testing versioning")
model DynatraceEnvironmentBase {
  @added(Versions.`2022-04-30-preview`)
  @doc("Dynatrace Environment Information")
  @visibility("read")
  environmentInfo?: EnvironmentInfo;
}

@doc("Properties of the Dynatrace environment.")
model DynatraceEnvironmentProperties extends DynatraceEnvironmentBase {
  @doc("User id")
  @visibility("read")
  userId?: string;

  @doc("Dynatrace Account Information")
  @visibility("read")
  accountInfo?: AccountInfo;
}

@doc("Dynatrace Account Information")
model AccountInfo {
  @visibility("read")
  @doc("Account Id of the account this environment is linked to")
  accountId?: string;

  @visibility("read")
  @doc("Region in which the account is created")
  regionId?: string;
}

@doc("Dynatrace account API Key")
model AccountInfoSecure {
  @visibility("read")
  @doc("Account Id of the account this environment is linked to")
  accountId?: string;

  @visibility("read")
  @doc("API Key of the user account")
  apiKey?: SecureString;

  @visibility("read")
  @doc("Region in which the account is created")
  regionId?: string;
}

@doc("Dynatrace Environment Information")
model EnvironmentInfo {
  @visibility("read")
  @doc("Id of the environment created")
  environmentId?: string;

  @visibility("read")
  @doc("Ingestion key of the environment")
  ingestionKey?: string;

  @visibility("read")
  @doc("Ingestion endpoint used for sending logs")
  logsIngestionEndpoint?: string;
}

@doc("Provisioning state of the monitoring resource")
@Azure.Core.lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,

  @doc("The resource provisioning has been accepted.")
  Accepted: "Accepted",

  @doc("The resource is being created.")
  Creating: "Creating",

  @doc("The resource is being updated.")
  Updating: "Updating",

  @doc("The resource is being deleted.")
  Deleting: "Deleting",

  @doc("The resource has been deleted.")
  Deleted: "Deleted",

  @doc("The resource status is unspecified.")
  NotSpecified: "NotSpecified",
}

@doc("Flag specifying if the resource monitoring is enabled or disabled.")
union MonitoringStatus {
  string,

  @doc("Monitoring enabled")
  Enabled: "Enabled",

  @doc("Monitoring disabled")
  Disabled: "Disabled",
}

@doc("Flag specifying the Marketplace Subscription Status of the resource. If payment is not made in time, the resource will go in Suspended state.")
union MarketplaceSubscriptionStatus {
  string,

  @doc("Subscription is active")
  Active: "Active",

  @doc("Subscription is suspended")
  Suspended: "Suspended",
}

@doc("Liftr resource category")
union LiftrResourceCategories {
  string,

  @doc("Unknown")
  Unknown: "Unknown",

  @doc("Monitor logs")
  MonitorLogs: "MonitorLogs",
}

@doc("User info.")
model UserInfo {
  @doc("First Name of the user")
  firstName?: MediumString;

  @doc("Last Name of the user")
  lastName?: MediumString;

  @doc("Email of the user used by Dynatrace for contacting them if needed")
  emailAddress?: email;

  @maxLength(40)
  @doc("Phone number of the user used by Dynatrace for contacting them if needed")
  phoneNumber?: string;

  @doc("Country of the user")
  country?: string;
}

@doc("Billing plan information.")
model PlanData {
  @doc("different usage type like PAYG/COMMITTED. this could be enum")
  usageType?: MediumString;

  @doc("different billing cycles like MONTHLY/WEEKLY. this could be enum")
  billingCycle?: MediumString;

  @doc("plan id as published by Dynatrace")
  planDetails?: MediumString;

  @doc("date when plan was applied")
  effectiveDate?: utcDateTime;
}

@doc("Properties for the Tag rules resource of a Monitor account.")
model MonitoringTagRulesProperties {
  @doc("Set of rules for sending logs for the Monitor resource.")
  logRules?: LogRules;

  @visibility("read")
  @doc("Provisioning state of the resource.")
  provisioningState?: ProvisioningState;
}

@doc("Set of rules for sending logs for the Monitor resource.")
model LogRules {
  @doc("Flag specifying if AAD logs should be sent for the Monitor resource.")
  sendAadLogs?: SendAadLogsStatus; // Enabled, Disabled

  @doc("Flag specifying if subscription logs should be sent for the Monitor resource.")
  sendSubscriptionLogs?: SendSubscriptionLogsStatus; // Enabled, Disabled

  @doc("Flag specifying if activity logs from Azure resources should be sent for the Monitor resource.")
  sendActivityLogs?: SendActivityLogsStatus; // Enabled, Disabled

  @doc("""
  List of filtering tags to be used for capturing logs. This only takes effect if SendActivityLogs flag is enabled. If empty, all resources will be captured.
  If only Exclude action is specified, the rules will apply to the list of all available resources. If Include actions are specified, the rules will only include resources with the associated tags.
  """)
  @OpenAPI.extension("x-ms-identifiers", ["name"])
  filteringTags?: FilteringTag[];
}

@doc("The definition of a filtering tag. Filtering tags are used for capturing resources and include/exclude them from being monitored.")
model FilteringTag {
  @doc("The name (also known as the key) of the tag.")
  name?: string;

  @doc("The value of the tag.")
  value?: string;

  @doc("Valid actions for a filtering tag. Exclusion takes priority over inclusion.")
  action?: TagAction;
}

@doc("Valid actions for a filtering tag. Exclusion takes priority over inclusion.")
union TagAction {
  string,

  @doc("Include tag")
  Include: "Include",

  @doc("Exclude tag")
  Exclude: "Exclude",
}

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
@doc("Response of payload to be passed while installing VM agent.")
model VMExtensionPayload {
  @doc("API Key of the user account")
  apiKey?: SecureString;

  @doc("Id of the environment created")
  environmentId?: string;
}

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
@doc("VM Resource Ids")
model VMResources {
  @doc("VM resource ID on which agent is installed")
  id?: virtualMachineId; // made a chaneg here to inform about the kind of reference this must be.

  @doc("Version of the Dynatrace agent installed on the VM.")
  agentVersion?: string;
}

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
@doc("Various states of the updating vm extension on resource")
union VMHostUpdateState {
  string,

  @doc("Extension is being installed")
  Install: "Install",

  @doc("Extension is being deleted")
  Delete: "Delete",
}

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
@doc("Response of a list VM Host Update Operation.")
model VMResourcesListResponse extends Azure.Core.Page<VMResources> {}

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
@doc("Host Update Parameter specification.")
model VMHostUpdateParameter {
  @doc("The details of the VMHost update request.")
  @body
  request: VMHostUpdateRequest;
}

#suppress "@azure-tools/typespec-azure-core/casing-style" "This is an existing service."
@doc("Request of a list VM Host Update Operation.")
model VMHostUpdateRequest {
  @doc("VM resource ID on which agent is installed/deleted")
  vmResourceIds?: VMResources[]; // [yes, it is] check if this is the correct way to make this an array

  @doc("Specifies the state of the operation - install/ delete.")
  state?: VMHostUpdateState;
}

@doc("Various states of the SSO resource")
union SingleSignOnStates {
  string,

  @doc("Initial state")
  Initial: "Initial",

  @doc("SSO is enabled")
  Enable: "Enable",

  @doc("SSO is disabled")
  Disable: "Disable",

  @doc("Existing SSO authentication")
  Existing: "Existing",
}

@doc("The details of a DynaTrace single sign-on.")
model DynatraceSingleSignOnProperties {
  @doc("State of Single Sign On")
  singleSignOnState?: SingleSignOnStates;

  @doc("Version of the Dynatrace agent installed on the VM.")
  enterpriseAppId?: string;

  @doc("The login URL specific to this Dynatrace Environment")
  singleSignOnUrl: string;

  @doc("array of Aad(azure active directory) domains")
  aadDomains: string[]; // [yes, it is] check if this is the correct way to make this an array

  @doc("Provisioning state of the resource.")
  provisioningState?: ProvisioningState;
}
