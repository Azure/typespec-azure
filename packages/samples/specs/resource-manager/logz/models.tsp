import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

namespace Microsoft.Logz;

using Azure.ResourceManager;

@doc("Reusable representation of an email address")
@pattern("^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\\.)+[A-Za-z]{2,}$")
scalar email extends string;

@doc("Shorthand for setting length limit.")
@minLength(5)
@maxLength(50)
scalar MediumString extends string;

@doc("A resource that is monitored by a Logz monitor instance.")
model MonitoredResource {
  @doc("The ARM id of the resource.")
  id: string;

  @doc("Flag indicating if resource is sending metrics to Logz.")
  sendingMetrics: boolean;

  @doc("Reason for why the resource is sending metrics (or why it is not sending).")
  reasonForMetricsStatus: string;

  @doc("Flag indicating if resource is sending logs to Logz.")
  sendingLogs: boolean;

  @doc("Reason for why the resource is sending logs (or why it is not sending).")
  reasonForLogsStatus: string;
}

@doc("A lit of monitored resources.")
model MonitoredResourceListResponse extends Azure.Core.Page<MonitoredResource> {}

@doc("The properties of a Logz Monitor Service resource.")
model LogzMonitorResourceProperties {
  @doc("Provisioning state of the resource.")
  provisioningState: ProvisioningState;

  @doc("Status of the monitor.")
  monitoringStatus: MonitoringStatus;

  @doc("Marketplace subscription status.")
  marketplaceSubscriptionStatus: MarketplaceSubscriptionStatus;

  @doc("Properties of the Logz organization.")
  logzOrganizationProperties: LogzOrganizationProperties;

  @doc("User info.")
  userInfo: UserInfo;

  @doc("Billing plan information.")
  planData: PlanData;

  @doc("Liftr Resource category.")
  liftrResourceCategory: LiftrResourceCategories;

  @doc("The priority of the resource.")
  liftrResourcePreference: int32;
}

@doc("Provisioning state of the monitoring resource")
@Azure.Core.lroStatus
enum ProvisioningState {
  ...ResourceProvisioningState,

  @doc("Accepted")
  Accepted,

  @doc("Creating")
  Creating,

  @doc("Updating")
  Updating,

  @doc("Deleting")
  Deleting,

  @doc("Deleted")
  Deleted,

  @doc("Not Specified")
  NotSpecified,
}

@doc("Flag specifying if the resource monitoring is enabled or disabled.")
enum MonitoringStatus {
  @doc("Enabled")
  Enabled,

  @doc("Disabled")
  Disabled,
}

@doc("Flag specifying the Marketplace Subscription Status of the resource. If payment is not made in time, the resource will go in Suspended state.")
enum MarketplaceSubscriptionStatus {
  @doc("Active")
  Active,

  @doc("Suspended")
  Suspended,
}

@doc("Details of the log organization.")
model LogzOrganizationProperties {
  @doc("Id of the Logz organization.")
  id: string;

  @doc("Name of the Logz organization.")
  companyName: string;

  @doc("The Id of the Enterprise App used for Single sign on.")
  enterpriseAppId: string;
}

@doc("User details.")
model UserInfo {
  @doc("First Name of the user")
  firstName: MediumString;

  @doc("Last Name of the user")
  lastName: MediumString;

  @doc("Email of the user used by Logz for contacting them if needed")
  emailAddress: email;

  @maxLength(40)
  @doc("Phone number of the user used by Logz for contacting them if needed")
  phoneNumber: string;
}

@doc("Billing plan information.")
model PlanData {
  @doc("different usage type like PAYG/COMMITTED. this could be enum")
  usageType: MediumString;

  @doc("different billing cycles like MONTHLY/WEEKLY. this could be enum")
  billingCycle: MediumString;

  @doc("plan id as published by Logz")
  planDetails: MediumString;

  @doc("date when plan was applied")
  effectiveDate: utcDateTime;
}

@doc("Liftr resource category")
enum LiftrResourceCategories {
  @doc("Unknown")
  Unknown,

  @doc("Monitor logs")
  MonitorLogs,
}

@doc("Properties for the Tag rules resource of a Monitor account.")
model MonitoringTagRulesProperties {
  @doc("Set of rules for sending logs for the Monitor resource.")
  logRules: LogRules;
}

@doc("Set of rules for sending logs for the Monitor resource.")
model LogRules {
  @doc("Flag specifying if AAD logs should be sent for the Monitor resource.")
  sendAadLogs: boolean;

  @doc("Flag specifying if subscription logs should be sent for the Monitor resource.")
  sendSubscriptionLogs: boolean;

  @doc("Flag specifying if activity logs from Azure resources should be sent for the Monitor resource.")
  sendActivityLogs: boolean;

  @doc("List of filtering tags to be used for capturing logs. This only takes effect if SendActivityLogs flag is enabled. If empty, all resources will be captured. If only Exclude action is specified, the rules will apply to the list of all available resources. If Include actions are specified, the rules will only include resources with the associated tags.")
  @OpenAPI.extension("x-ms-identifiers", ["name"])
  filteringTags: FilteringTag[];
}

@doc("The definition of a filtering tag. Filtering tags are used for capturing resources and include/exclude them from being monitored.")
model FilteringTag {
  @doc("The name (also known as the key) of the tag.")
  name: string;

  @doc("The value of the tag.")
  value: string;

  @doc("The action associated with thsi tag.")
  action: TagAction;
}

@doc("Valid actions for a filtering tag. Exclusion takes priority over inclusion.")
enum TagAction {
  @doc("Include")
  Include,

  @doc("Exclude")
  Exclude,
}

@doc("Single sign-on properties for a LogZ resource.")
model LogzSingleSignOnProperties {
  @doc("Various states of the SSO resource")
  singleSignOnState: SingleSignOnStates;

  @doc("The Id of the Enterprise App used for Single sign-on.")
  enterpriseAppId: string;

  @doc("The login URL specific to this Logz Organization.")
  singleSignOnUrl: string;

  @doc("The provisioning state of the SSO resource")
  provisioningState: ProvisioningState;
}

@doc("Various states of the SSO resource")
enum SingleSignOnStates {
  @doc("Initial")
  Initial,

  @doc("Enable")
  Enable,

  @doc("Disable")
  Disable,

  @doc("Existing")
  Existing,
}
