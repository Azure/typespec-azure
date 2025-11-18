using Http;
using Rest;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager.CommonTypes;

/** Network security perimeter (NSP) configuration resource. Providers must instantiate an instance of this resource in their
 * provider namespace to enable NSP capabilities for their resources.
 *
 * @template KeyName Optional. The name of the NSP configuration resource name parameter. By default, this is `networkSecurityPerimeterConfigurationName`.
 * @template Description Optional. The documentary description of the NSP configuration resource name parameter.
 *
 * @example
 * ```ts
 * namespace Microsoft.Contoso;
 * model NspConfiguration is NspConfigurationResource {}
 * alias EmployeeConfigOps is NspConfigurations<NspConfiguration>;
 * @armResourceOperations
 * interface Employees {
 *  @doc("get a network security perimeter configuration for resource employee")
 *  getNspConfiguration is EmployeeConfigOps.Read<Employee>;
 * }
 * ```
 */
@doc(Description)
@armResourceWithParameter(
  CommonTypes.NetworkSecurityPerimeterConfigurationProperties,
  "networkSecurityPerimeterConfigurations",
  KeyName
)
@Http.Private.includeInapplicableMetadataInPayload(false)
model NspConfigurationResource<
  KeyName extends valueof string,
  Description extends valueof string = "A network security perimeter configuration resource."
> is CommonTypes.NetworkSecurityPerimeterConfiguration;

/**
 * Operations over network security perimeter resources.
 * @template NspConfigurationResourceModel The type of the network security perimeter configuration resource. You must declare a network security perimeter configuration resource type in your provider namespace.
 * @template NspConfigurationKeyName Optional. The NSP configuration resource name parameter. By default, this is `networkSecurityPerimeterConfigurationName`.
 * @template ResourceName Optional. The name of the network security perimeter configuration resource in this context, by default, this is `{targetResourceName}NetworkSecurityPerimeterConfiguration`.
 *
 * @example
 * ```ts
 * namespace Microsoft.Contoso;
 * model NspConfiguration is NspConfigurationResource {}
 * alias EmployeeNspConfigurationOps is NspConfigurations<NspConfiguration>;
 * @armResourceOperations
 * interface Employees {
 *  @doc("get a network security perimeter configuration for resource employee")
 *  getNspConfiguration is EmployeeNspConfigurationOps.Read<Employee>;
 * }
 * ```
 */
@Versioning.added(Versions.v5)
interface NspConfigurations<
  NspConfigurationResourceModel extends NetworkSecurityPerimeterConfiguration,
  NspConfigurationKeyName extends valueof string = "networkSecurityPerimeterConfigurationName",
  ResourceName extends valueof string = string("")
> {
  /**
   * @dev List the network security perimeter configurations to a resource
   * @template ParentResource the parent resource of the NspConfiguration
   * @template Resource Optional. The NspConfiguration resource being listed
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template ParentName Optional. The name of the parent resource
   * @template ParentFriendlyName Optional. The friendly name of the parent resource
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the list operation
   * @template Error Optional. The error response, if non-standard.
   * @template OverrideResourceName Optional. The name of the network security perimeter configuration resource being operated on.
   */
  @Versioning.added(Versions.v5)
  @doc("List {name} NetworkSecurityPerimeterConfigurations", ParentResource)
  @get
  @autoRoute
  @list
  @listsResource(Resource)
  @segmentOf(NspConfigurationParameter)
  @builtInResourceOperation(ParentResource, Resource, "list", OverrideResourceName)
  @Azure.ResourceManager.Private.enforceConstraint(ParentResource, Foundations.Resource)
  ListByParent<
    ParentResource extends Foundations.SimpleResource,
    Resource extends NetworkSecurityPerimeterConfiguration = NspConfigurationResourceModel,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<ResourceListResult<Resource>>,
    Error extends {} = ErrorResponse,
    OverrideResourceName extends valueof string = "${ResourceName}"
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> & Parameters,
    Response,
    Error
  >;

  /**
   * @dev List the network security parameter configuration for a resource without pagination - this should only be used for legacy operations
   * @template ParentResource the parent resource of the NspConfiguration
   * @template Resource Optional. The NspConfiguration resource being listed
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template ParentName Optional. The name of the parent resource
   * @template ParentFriendlyName Optional. The friendly name of the parent resource
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the list operation
   * @template Error Optional. The error response, if non-standard.
   * @template OverrideResourceName Optional. The name of the network security perimeter configuration resource being operated on.
   */
  @Versioning.added(Versions.v5)
  @Azure.ResourceManager.Private.legacyType
  @doc("List {name} NetworkSecurityPerimeterConfigurations", ParentResource)
  @get
  @autoRoute
  @listsResource(Resource)
  @segmentOf(NspConfigurationParameter)
  @builtInResourceOperation(ParentResource, Resource, "list", OverrideResourceName)
  @Azure.ResourceManager.Private.enforceConstraint(ParentResource, Foundations.Resource)
  ListSinglePageByParent<
    ParentResource extends Foundations.SimpleResource,
    Resource extends NetworkSecurityPerimeterConfiguration = NspConfigurationResourceModel,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<ResourceListResult<Resource>>,
    Error extends {} = ErrorResponse,
    OverrideResourceName extends valueof string = "${ResourceName}"
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> & Parameters,
    Response,
    Error
  >;

  /**
   * @dev GET a network security perimeter configuration for a particular resource
   * @template ParentResource the parent resource of the NspConfiguration
   * @template Resource the NspConfiguration resource being read
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template KeyName Optional. The NSP configuration resource name parameter. By default, this is `networkSecurityPerimeterConfigurationName`
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the read operation
   * @template Error Optional. The error response, if non-standard.
   * @template OverrideResourceName Optional. The name of the network security perimeter configuration resource being operated on.
   */
  @Versioning.added(Versions.v5)
  @autoRoute
  @doc("Get a {name} NetworkSecurityPerimeterConfiguration", ParentResource)
  @get
  @builtInResourceOperation(ParentResource, Resource, "read", OverrideResourceName)
  Read<
    ParentResource extends Foundations.SimpleResource,
    Resource extends NetworkSecurityPerimeterConfiguration = NspConfigurationResourceModel,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    KeyName extends valueof string = NspConfigurationKeyName,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
    Error extends {} = ErrorResponse,
    OverrideResourceName extends valueof string = "${ResourceName}"
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<NspConfigurationParameter> &
      Parameters,
    Response,
    Error
  >;
}
