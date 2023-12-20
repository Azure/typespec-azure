using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

/**
 * The default api-version parameter type.
 */
@doc("The default api-version parameter type.")
model ApiVersionParameter {
  @query("api-version")
  @minLength(1)
  @doc("The API version to use for this operation.")
  @armCommonParameter("ApiVersionParameter", Azure.ResourceManager.CommonTypes.Versions.v3)
  @armCommonParameter("ApiVersionParameter", Azure.ResourceManager.CommonTypes.Versions.v4)
  @armCommonParameter("ApiVersionParameter", Azure.ResourceManager.CommonTypes.Versions.v5)
  @resourceParameterBaseFor(
    [
      ResourceHome.ResourceGroup,
      ResourceHome.Subscription,
      ResourceHome.Location,
      ResourceHome.Tenant,
      ResourceHome.Extension
    ]
  )
  apiVersion: string;
}

/**
 * The default subscriptionId parameter type.
 */
@doc("The default subscriptionId parameter type.")
model SubscriptionIdParameter {
  @path
  @minLength(1)
  @segment("subscriptions")
  @doc("The ID of the target subscription.")
  @armCommonParameter("SubscriptionIdParameter", Azure.ResourceManager.CommonTypes.Versions.v3)
  @armCommonParameter("SubscriptionIdParameter", Azure.ResourceManager.CommonTypes.Versions.v4)
  @armCommonParameter("SubscriptionIdParameter", Azure.ResourceManager.CommonTypes.Versions.v5)
  @resourceParameterBaseFor(
    [ResourceHome.ResourceGroup, ResourceHome.Subscription, ResourceHome.Location]
  )
  subscriptionId: string;
}

/**
 * DEPRECATED - DO NOT USE
 * The default location parameter type.
 */
@doc("The default location parameter type.")
model LocationParameter {
  @path
  @minLength(1)
  @segment("locations")
  @doc("The location name.")
  @armCommonParameter("LocationParameter", Azure.ResourceManager.CommonTypes.Versions.v3)
  @armCommonParameter("LocationParameter", Azure.ResourceManager.CommonTypes.Versions.v4)
  @armCommonParameter("LocationParameter", Azure.ResourceManager.CommonTypes.Versions.v5)
  @resourceParameterBaseFor([ResourceHome.Location])
  location: string;
}

/**
 * The default location parameter type.
 */
@doc("The default location parameter type.")
model LocationResourceParameter {
  @path
  @minLength(1)
  @segment("locations")
  @doc("The location name.")
  @key
  @armCommonParameter("LocationParameter", Azure.ResourceManager.CommonTypes.Versions.v3)
  @armCommonParameter("LocationParameter", Azure.ResourceManager.CommonTypes.Versions.v4)
  @armCommonParameter("LocationParameter", Azure.ResourceManager.CommonTypes.Versions.v5)
  location: string;
}

@tenantResource
model TenantLocationResource {
  ...LocationResourceParameter;
}

@subscriptionResource
model SubscriptionLocationResource {
  ...LocationResourceParameter;
}

/**
 * The default resource group parameter type.
 */
@doc("The default resource group parameter type.")
model ResourceGroupParameter {
  @path
  @minLength(1)
  @maxLength(90)
  @segment("resourceGroups")
  @pattern("^[-\\w\\._\\(\\)]+$")
  @doc("The name of the resource group. The name is case insensitive.")
  @armCommonParameter("ResourceGroupNameParameter", Azure.ResourceManager.CommonTypes.Versions.v3)
  @armCommonParameter("ResourceGroupNameParameter", Azure.ResourceManager.CommonTypes.Versions.v4)
  @armCommonParameter("ResourceGroupNameParameter", Azure.ResourceManager.CommonTypes.Versions.v5)
  @resourceParameterBaseFor([ResourceHome.ResourceGroup])
  resourceGroupName: string;
}

/**
 * The default resourceUri parameter type.
 */
@doc("The default resourceUri parameter type.")
model ResourceUriParameter {
  @path
  @doc("The fully qualified Azure Resource manager identifier of the resource.")
  @extension("x-ms-skip-url-encoding", true)
  @resourceParameterBaseFor([ResourceHome.Extension])
  resourceUri: string;
}

/**
 * The dynamic parameters of a resource instance - pass in the proper base type to indicate
 * where the resource is based.  The default is in a resource group
 * @template TResource The resource to get parameters for
 * @template TBaseParameters The parameters representing the base Uri of the resource
 */
model ResourceInstanceParameters<
  TResource extends ArmResourceBase,
  TBaseParameters = BaseParameters<TResource>
> {
  ...TBaseParameters;
  ...ProviderNamespace<TResource>;
  ...KeysOf<TResource>;
}

/**
 * The dynamic parameters of a list call for a resource instance - pass in the proper base type to indicate
 * where the list should take place.  The default is in a resource group
 * @template TResource The resource to get parameters for
 * @template TBaseParameters The parameters representing the base Uri of the resource
 */
model ResourceParentParameters<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> {
  ...TBaseParameters;
  ...ProviderNamespace<TResource>;
  ...ParentKeysOf<TResource>;
}

/**
 * The dynamic parameters of a list call for an extension resource instance.
 * @template TResource The extension resource
 */
alias ExtensionResourceInstanceParameters<TResource extends ArmResource> = ResourceInstanceParameters<
  TResource,
  ExtensionBaseParameters
>;

/**
 * The dynamic parameters of a list call for a tenant resource instance.
 * @template TResource the tenant resource
 */
alias TenantInstanceParameters<TResource extends ArmResource> = ResourceInstanceParameters<
  TResource,
  TenantBaseParameters
>;
