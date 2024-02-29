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

@armProviderNamespace
@service({
  title: "Microsoft.Logz",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1, Azure.Core.Versions.v1_0_Preview_2)
namespace Microsoft.Logz;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("The LogZ Monitor resource details.")
model LogzMonitorResource is TrackedResource<LogzMonitorResourceProperties> {
  @doc("Monitor resource name")
  @key("monitorName")
  @segment("monitors")
  @path
  name: string;
}

@armResourceOperations
interface Monitors
  extends TrackedResourceOperations<LogzMonitorResource, LogzMonitorResourceProperties> {
  @doc("List the resources currently being monitored by the Logz monitor resource.")
  @post
  @armResourceAction(LogzMonitorResource)
  listMonitoredResources(
    ...ResourceInstanceParameters<LogzMonitorResource>,
  ): MonitoredResourceListResponse | ErrorResponse;
}

@doc("Details of a TagRule.")
@parentResource(LogzMonitorResource)
model TagRuleResource is ProxyResource<TagRuleProperties> {
  @doc("Tag name")
  @key("tagName")
  @segment("tagRules")
  @path
  name: string;
}

@doc("The properties of a tag rule resource")
model TagRuleProperties {
  ...DefaultProvisioningStateProperty;
}

@armResourceOperations
interface TagRules extends ProxyResourceOperations<TagRuleResource> {}

@doc("Details of a single sign-on configuration.")
@parentResource(LogzMonitorResource)
model SingleSignOnConfigurationResource is ProxyResource<LogzSingleSignOnProperties> {
  @doc("Configuration name")
  @key("configurationName")
  @segment("singleSignOnConfigurations")
  @path
  name: string;
}

@armResourceOperations
interface SingleSignOnConfigurations
  extends ProxyResourceOperations<SingleSignOnConfigurationResource>,
    ProxyResourceUpdate<SingleSignOnConfigurationResource, LogzSingleSignOnProperties> {}

@doc("Details of a sub account.")
@parentResource(LogzMonitorResource)
model SubAccountResource is ProxyResource<LogzMonitorResourceProperties> {
  @doc("Sub account name")
  @key("subAccountName")
  @segment("accounts")
  @path
  name: string;
}

@armResourceOperations
interface SubAccounts extends ProxyResourceOperations<SubAccountResource> {}

@doc("Details of a SubAccount TagRule.")
@parentResource(SubAccountResource)
model SubAccountTagRuleResource is ProxyResource<SubAccountProperties> {
  @doc("Tag name")
  @key("tagName")
  @segment("tagRules")
  @path
  name: string;
}

@doc("The properties of a subAccount resource")
model SubAccountProperties {
  ...DefaultProvisioningStateProperty;
}

@armResourceOperations
interface SubAccountTagRules extends ProxyResourceOperations<SubAccountTagRuleResource> {}
