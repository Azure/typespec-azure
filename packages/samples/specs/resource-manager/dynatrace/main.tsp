import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "./models.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;
using Autorest;

@armProviderNamespace
@service({
  title: "Dynatrace.Observability",
})
@versioned(Versions)
namespace Dynatrace.Observability;

interface Operations extends Azure.ResourceManager.Operations {
  checkName is checkGlobalNameAvailability;
  checkLocalName is checkLocalNameAvailability;
}

@doc("Dynatrace Monitor Resource version")
enum Versions {
  @doc("Version 2021-06-13-preview")
  @useDependency(Azure.Core.Versions.v1_0_Preview_2, Azure.ResourceManager.Versions.v1_0_Preview_1)
  `2021-06-13-preview`,

  @doc("Version 2021-07-01-preview")
  @useDependency(Azure.Core.Versions.v1_0_Preview_2, Azure.ResourceManager.Versions.v1_0_Preview_1)
  `2022-04-30-preview`,
}

@doc("Dynatrace Monitor Resource")
model MonitorResource is TrackedResource<MonitorProperties> {
  @doc("Monitor resource name")
  @key("monitorName")
  @segment("monitors")
  @path
  name: string;

  ...ManagedServiceIdentityProperty; // change here to use the standard definition
}

@armResourceOperations
interface Monitors extends TrackedResourceOperations<MonitorResource, MonitorProperties> {
  @post
  @doc("Gets the user account credentials for a Monitor")
  @armResourceAction(MonitorResource)
  getAccountCredentials(
    ...ResourceInstanceParameters<MonitorResource>,
  ): AccountInfoSecure | ErrorResponse;

  @post
  @doc("List the resources currently being monitored by the Dynatrace monitor resource.")
  @armResourceAction(MonitorResource)
  listMonitoredResources(
    ...ResourceInstanceParameters<MonitorResource>,
  ): ArmResponse<MonitoredResourceListResponse> | ErrorResponse;

  @post
  @action("vmHostPayload")
  @doc("Returns the payload that needs to be passed in the request body for installing Dynatrace agent on a VM.")
  @armResourceAction(MonitorResource)
  getVmHostPayload(
    ...ResourceInstanceParameters<MonitorResource>,
  ): ArmResponse<VMExtensionPayload> | ErrorResponse;

  @post
  @action("vmHostUpdate")
  @doc("Sending request to update the collection when Dynatrace agent has been installed on a VM for a given monitor.")
  @armResourceAction(MonitorResource)
  listVmHostUpdate(
    ...ResourceInstanceParameters<MonitorResource>,
    ...VMHostUpdateParameter, // change here
  ): ArmResponse<VMResourcesListResponse> | ErrorResponse;

  @post
  @doc("List the compute resources currently being monitored by the Dynatrace resource.")
  @armResourceAction(MonitorResource)
  listVmHosts(
    ...ResourceInstanceParameters<MonitorResource>,
  ): ArmResponse<VMResourcesListResponse> | ErrorResponse;

  @post
  @action("singleSignOnConfigurations")
  @doc("List the single sign-on configurations for a given monitor resource.")
  @armResourceAction(MonitorResource)
  listSingleSignOnConfigurations(
    ...ResourceInstanceParameters<MonitorResource>,
  ): ArmResponse<VMResourcesListResponse> | ErrorResponse;
}

@doc("Tag rules for a monitor resource")
@parentResource(MonitorResource)
model TagRule is ProxyResource<MonitoringTagRulesProperties> {
  @doc("Monitor RuleSet resource name")
  @key("ruleSetName")
  @segment("tagRules")
  @path
  name: string;
}

@armResourceOperations
interface TagRules
  extends ProxyResourceOperations<TagRule>,
    ProxyResourceUpdate<TagRule, MonitoringTagRulesProperties> {}

// note: I think you only need get.  It is odd to have PUT without DELETE, though.

@doc("Single sign-on configurations for a given monitor resource.")
@parentResource(MonitorResource)
model DynatraceSingleSignOnResource is ProxyResource<DynatraceSingleSignOnProperties> {
  @doc("Single Sign On Configuration Name")
  @key("configurationName")
  @segment("singleSignOnConfigurations")
  @path
  name: string;
}

// check if this is correct. We only need these 2 operations

#suppress "@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation" "Single sign on resources must be deleted out of band"
@armResourceOperations(DynatraceSingleSignOnResource)
interface SingleSignOn
  extends ResourceCreate<DynatraceSingleSignOnResource>,
    ResourceRead<DynatraceSingleSignOnResource>,
    ResourceListByParent<DynatraceSingleSignOnResource> {}
