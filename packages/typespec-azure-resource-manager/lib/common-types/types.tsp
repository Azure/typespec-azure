using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.Core;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager.Foundations;

/** Base class used for type definitions */
model ArmResourceBase {}

/**
 * Base model that defines common properties for all Azure Resource Manager resources.
 */
@doc("Common properties for all Azure Resource Manager resources.")
model Resource extends ArmResourceBase {
  @doc("Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}")
  @visibility("read")
  id?: armResourceIdentifier;

  @doc("The name of the resource")
  @visibility("read")
  name?: string;

  @doc("The type of the resource. E.g. \"Microsoft.Compute/virtualMachines\" or \"Microsoft.Storage/storageAccounts\"")
  @visibility("read")
  type?: string;

  @doc("Azure Resource Manager metadata containing createdBy and modifiedBy information.")
  @visibility("read")
  systemData?: SystemData;
}

/** The resource model definition for an Azure Resource Manager resource with an etag. */
@armCommonDefinition("TrackedResource", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("TrackedResource", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("TrackedResource", Azure.ResourceManager.CommonTypes.Versions.v5)
model AzureEntityResource extends Resource {
  /** Resource Etag. */
  @visibility("read")
  etag: string;
}

/**
 * Standard type definition for Azure Resource Manager Tags property.
 *
 * It is included in the TrackedResource template definition.
 */
@doc("The Azure Resource Manager Resource tags.")
model ArmTagsProperty {
  @doc("Resource tags.")
  tags?: Record<string>;
}

/**
 * The base tracked resource.
 */
@armCommonDefinition("TrackedResource", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("TrackedResource", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("TrackedResource", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location'")
model TrackedResource extends Resource {
  @doc("The geo-location where the resource lives")
  @visibility("read", "create")
  location: string;

  ...ArmTagsProperty;
}

/**
 * The base proxy resource.
 */
@doc("The base proxy resource.")
@armCommonDefinition("ProxyResource", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("ProxyResource", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("ProxyResource", Azure.ResourceManager.CommonTypes.Versions.v5)
model ProxyResource extends Resource {}

/**
 * The base extension resource.
 */
// Note that ProxyResource is the base definition for both kinds of resources
@doc("The base extension resource.")
@armCommonDefinition("ProxyResource", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("ProxyResource", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("ProxyResource", Azure.ResourceManager.CommonTypes.Versions.v5)
model ExtensionResource extends Resource {}

/**
 * The SKU (Stock Keeping Unit) assigned to this resource.
 */
@doc("The SKU (Stock Keeping Unit) assigned to this resource.")
@armCommonDefinition("Sku", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("Sku", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("Sku", Azure.ResourceManager.CommonTypes.Versions.v5)
model Sku {
  @doc("The name of the SKU, usually a combination of letters and numbers, for example, 'P3'")
  name: string;

  @doc("This field is required to be implemented by the Resource Provider if the service has more than one tier, but is not required on a PUT.")
  tier?: SkuTier;

  @doc("The SKU size. When the name field is the combination of tier and some other value, this would be the standalone code.")
  size?: string;

  @doc("If the service has different generations of hardware, for the same SKU, then that can be captured here.")
  family?: string;

  @doc("If the SKU supports scale out/in then the capacity integer should be included. If scale out/in is not possible for the resource this may be omitted.")
  capacity?: int32;
}

/**
 * Available service tiers for the SKU.
 */
@doc("Available service tiers for the SKU.")
enum SkuTier {
  @doc("The Free service tier.")
  Free,

  @doc("The Basic service tier.")
  Basic,

  @doc("The Standard service tier.")
  Standard,

  @doc("The Premium service tier.")
  Premium,
}

/**
 * A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.
 */
@armCommonDefinition("OperationListResult", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("OperationListResult", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("OperationListResult", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("""
A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.
""")
model OperationListResult is Azure.Core.Page<Operation>;

/**
 * Details of a REST API operation, returned from the Resource Provider Operations API
 */
@armCommonDefinition("Operation", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("Operation", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("Operation", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("Details of a REST API operation, returned from the Resource Provider Operations API")
model Operation {
  @doc("""
  The name of the operation, as per Resource-Based Access Control (RBAC). Examples: "Microsoft.Compute/virtualMachines/write", "Microsoft.Compute/virtualMachines/capture/action"
  """)
  @visibility("read")
  name?: string;

  @doc("""
  Whether the operation applies to data-plane. This is "true" for data-plane operations and "false" for Azure Resource Manager/control-plane operations.
  """)
  @visibility("read")
  isDataAction?: boolean;

  @doc("Localized display information for this particular operation.")
  display?: OperationDisplay;

  @doc("""
  The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"
  """)
  @visibility("read")
  origin?: Origin;

  @doc("""
  Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.
  """)
  actionType?: ActionType;
}

/**
 * Localized display information for and operation.
 */
@armCommonDefinition("OperationDisplay", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("OperationDisplay", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("OperationDisplay", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("Localized display information for and operation.")
model OperationDisplay {
  @doc("""
  The localized friendly form of the resource provider name, e.g. "Microsoft Monitoring Insights" or "Microsoft Compute".
  """)
  provider?: string;

  @doc("""
  The localized friendly name of the resource type related to this operation. E.g. "Virtual Machines" or "Job Schedule Collections".
  """)
  resource?: string;

  @doc("""
  The concise, localized friendly name for the operation; suitable for dropdowns. E.g. "Create or Update Virtual Machine", "Restart Virtual Machine".
  """)
  operation?: string;

  @doc("The short, localized friendly description of the operation; suitable for tool tips and detailed views.")
  description?: string;
}

/**
 * The current status of an async operation.
 */
@armCommonDefinition("OperationStatusResult", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("OperationStatusResult", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("OperationStatusResult", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("The current status of an async operation.")
model OperationStatusResult {
  @doc("Fully qualified ID for the async operation.")
  id?: string;

  @doc("Name of the async operation.")
  name?: string;

  @doc("Operation status.")
  status: string;

  @doc("Percent of the operation that is complete.")
  @minValue(0)
  @maxValue(100)
  percentComplete?: int32;

  @doc("The start time of the operation.")
  startTime?: utcDateTime;

  @doc("The end time of the operation.")
  endTime?: utcDateTime;

  @doc("The operations list.")
  operations: OperationStatusResult[];

  @doc("If present, details of the operation error.")
  error?: ErrorDetail;
}

/**
 * The default operationId parameter type.
 */
@doc("The default operationId parameter type.")
model OperationIdParameter {
  @path
  @minLength(1)
  @doc("The ID of an ongoing async operation.")
  @armCommonParameter("OperationIdParameter", Azure.ResourceManager.CommonTypes.Versions.v3)
  @armCommonParameter("OperationIdParameter", Azure.ResourceManager.CommonTypes.Versions.v4)
  @armCommonParameter("OperationIdParameter", Azure.ResourceManager.CommonTypes.Versions.v5)
  operationId: string;
}

/**
 * Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.
 */
@doc("""
Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.
""")
union ActionType {
  @doc("Actions are for internal-only APIs.")
  Internal: "Internal",

  string,
}

/**
 * The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"
 */
@doc("""
The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"
""")
union Origin {
  @doc("Indicates the operation is initiated by a user.")
  user: "user",

  @doc("Indicates the operation is initiated by a system.")
  system: "system",

  @doc("Indicates the operation is initiated by a user or system.")
  `user,system`: "user,system",

  string,
}

/**
 * The error detail.
 */
@armCommonDefinition("ErrorDetail", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("ErrorDetail", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("ErrorDetail", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("The error detail.")
model ErrorDetail {
  @doc("The error code.")
  @visibility("read")
  code?: string;

  @doc("The error message.")
  @visibility("read")
  message?: string;

  @doc("The error target.")
  @visibility("read")
  target?: string;

  @extension("x-ms-identifiers", ["message", "target"])
  @doc("The error details.")
  @visibility("read")
  details?: ErrorDetail[];

  @extension("x-ms-identifiers", ["message", "target"])
  @doc("The error additional info.")
  @visibility("read")
  additionalInfo?: ErrorAdditionalInfo[];
}

/**
 * The resource management error additional info.
 */
@armCommonDefinition("ErrorAdditionalInfo", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("ErrorAdditionalInfo", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("ErrorAdditionalInfo", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("The resource management error additional info.")
model ErrorAdditionalInfo {
  @doc("The additional info type.")
  @visibility("read")
  type?: string;

  @doc("The additional info.")
  @visibility("read")
  info?: {};
}

/**
 * Metadata pertaining to creation and last modification of the resource.
 */
@armCommonDefinition("systemData", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("systemData", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("systemData", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("Metadata pertaining to creation and last modification of the resource.")
model SystemData {
  @visibility("read")
  @doc("The identity that created the resource.")
  createdBy?: string;

  @visibility("read")
  @doc("The type of identity that created the resource.")
  createdByType?: createdByType;

  @visibility("read")
  @doc("The type of identity that created the resource.")
  createdAt?: plainDate;

  @visibility("read")
  @doc("The identity that last modified the resource.")
  lastModifiedBy?: string;

  @visibility("read")
  @doc("The type of identity that last modified the resource.")
  lastModifiedByType?: createdByType;

  @visibility("read")
  @doc("The timestamp of resource last modification (UTC)")
  lastModifiedAt?: plainDate;
}

/**
 * The kind of entity that created the resource.
 */
// NOTE: This is how the extensible enum is named in types.json
@doc("The kind of entity that created the resource.")
union createdByType {
  @doc("The entity was created by a user.")
  User: "User",

  @doc("The entity was created by an application.")
  Application: "Application",

  @doc("The entity was created by a managed identity.")
  ManagedIdentity: "ManagedIdentity",

  @doc("The entity was created by a key.")
  Key: "Key",

  string,
}

/**
 * Details of the resource plan.
 */
@doc("Details of the resource plan.")
@armCommonDefinition("Plan", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("Plan", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("Plan", Azure.ResourceManager.CommonTypes.Versions.v5)
model Plan {
  @doc("A user defined name of the 3rd Party Artifact that is being procured.")
  name: string;

  @doc("The publisher of the 3rd Party Artifact that is being bought. E.g. NewRelic")
  publisher: string;

  @doc("The 3rd Party artifact that is being procured. E.g. NewRelic. Product maps to the OfferID specified for the artifact at the time of Data Market onboarding. ")
  product: string;

  @doc("A publisher provided promotion code as provisioned in Data Market for the said product/artifact.")
  promotionCode?: string;

  @doc("The version of the desired product/artifact.")
  version?: string;
}

/**
 * The check availability request body.
 */
@armCommonDefinition("CheckNameAvailabilityRequest", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("CheckNameAvailabilityRequest", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("CheckNameAvailabilityRequest", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("The check availability request body.")
model CheckNameAvailabilityRequest {
  @doc("The name of the resource for which availability needs to be checked.")
  name?: string;

  @doc("The resource type.")
  type?: string;
}

/**
 * The check availability result.
 */
@armCommonDefinition("CheckNameAvailabilityResponse", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("CheckNameAvailabilityResponse", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("CheckNameAvailabilityResponse", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("The check availability result.")
model CheckNameAvailabilityResponse {
  @doc("Indicates if the resource name is available.")
  nameAvailable?: boolean;

  @doc("The reason why the given name is not available.")
  reason?: CheckNameAvailabilityReason;

  @doc("Detailed reason why the given name is not available.")
  message?: string;
}

/**
 * Possible reasons for a name not being available.
 */
@doc("Possible reasons for a name not being available.")
union CheckNameAvailabilityReason {
  @doc("Name is invalid.")
  Invalid: "Invalid",

  @doc("Name already exists.")
  AlreadyExists: "AlreadyExists",

  string,
}
