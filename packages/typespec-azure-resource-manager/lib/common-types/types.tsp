using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager.CommonTypes;

/**
 * Base model that defines common properties for all Azure Resource Manager resources.
 */
/** Common properties for all Azure Resource Manager resources. */
model Resource {
  /** Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName} */
  @renamedFrom(Versions.v3, "id")
  @removed(Versions.v4)
  @visibility("read")
  idV3?: string;

  /** Fully qualified resource ID for the resource. E.g. \"/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}\" */
  @added(CommonTypes.Versions.v4)
  @visibility("read")
  id?: uuid;

  /** The name of the resource */
  @visibility("read")
  name?: string;

  /** The type of the resource. E.g. \"Microsoft.Compute/virtualMachines\" or \"Microsoft.Storage/storageAccounts\ */
  @visibility("read")
  type?: string;

  /** Azure Resource Manager metadata containing createdBy and modifiedBy information. */
  @visibility("read")
  systemData?: SystemData;
}

/** The resource model definition for an Azure Resource Manager resource with an etag. */
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
/** The Azure Resource Manager Resource tags. */
model ArmTagsProperty {
  /** Resource tags. */
  tags?: Record<string>;
}

/**
 * The base tracked resource.
 */
/** The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location' */
model TrackedResource extends Resource {
  /** The geo-location where the resource lives */
  @visibility("read", "create")
  location: string;

  ...ArmTagsProperty;
}

/**
 * The base proxy resource.
 */
/** The base proxy resource. */
model ProxyResource extends Resource {}

/**
 * The base extension resource.
 */
// Note that ProxyResource is the base definition for both kinds of resources
/** The base extension resource. */
model ExtensionResource extends Resource {}

/**
 * The SKU (Stock Keeping Unit) assigned to this resource.
 */
/** The SKU (Stock Keeping Unit) assigned to this resource. */
model Sku {
  /** The name of the SKU, usually a combination of letters and numbers, for example, 'P3' */
  name: string;

  /** This field is required to be implemented by the Resource Provider if the service has more than one tier, but is not required on a PUT. */
  tier?: SkuTier;

  /** The SKU size. When the name field is the combination of tier and some other value, this would be the standalone code. */
  size?: string;

  /** If the service has different generations of hardware, for the same SKU, then that can be captured here. */
  family?: string;

  /** If the SKU supports scale out/in then the capacity integer should be included. If scale out/in is not possible for the resource this may be omitted. */
  capacity?: int32;
}

/**
 * Available service tiers for the SKU.
 */
/** Available service tiers for the SKU. */
enum SkuTier {
  /** The Free service tier. */
  Free,

  /** The Basic service tier. */
  Basic,

  /** The Standard service tier. */
  Standard,

  /** The Premium service tier. */
  Premium,
}

/**
 * A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.
 */
/** 
A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.
 */
model OperationListResult is Azure.Core.Page<Operation>;

/**
 * Details of a REST API operation, returned from the Resource Provider Operations API
 */
/** Details of a REST API operation, returned from the Resource Provider Operations API */
model Operation {
  /** 
  The name of the operation, as per Resource-Based Access Control (RBAC). Examples: "Microsoft.Compute/virtualMachines/write", "Microsoft.Compute/virtualMachines/capture/action"
   */
  @visibility("read")
  name?: string;

  /** 
  Whether the operation applies to data-plane. This is "true" for data-plane operations and "false" for Azure Resource Manager/control-plane operations.
   */
  @visibility("read")
  isDataAction?: boolean;

  /** Localized display information for this particular operation. */
  display?: OperationDisplay;

  /** 
  The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"
   */
  @visibility("read")
  origin?: Origin;

  /** 
  Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.
   */
  actionType?: ActionType;
}

/**
 * Localized display information for and operation.
 */
/** Localized display information for and operation. */
model OperationDisplay {
  /** 
  The localized friendly form of the resource provider name, e.g. "Microsoft Monitoring Insights" or "Microsoft Compute".
   */
  provider?: string;

  /** 
  The localized friendly name of the resource type related to this operation. E.g. "Virtual Machines" or "Job Schedule Collections".
   */
  resource?: string;

  /** 
  The concise, localized friendly name for the operation; suitable for dropdowns. E.g. "Create or Update Virtual Machine", "Restart Virtual Machine".
   */
  operation?: string;

  /** The short, localized friendly description of the operation; suitable for tool tips and detailed views. */
  description?: string;
}

/**
 * The current status of an async operation.
 */
/** The current status of an async operation. */
model OperationStatusResult {
  /** Fully qualified ID for the async operation. */
  id?: string;

  /** Name of the async operation. */
  name?: string;

  /** Operation status. */
  status: string;

  /** Percent of the operation that is complete. */
  @minValue(0)
  @maxValue(100)
  percentComplete?: float64;

  /** The start time of the operation. */
  startTime?: utcDateTime;

  /** The end time of the operation. */
  endTime?: utcDateTime;

  /** The operations list. */
  operations: OperationStatusResult[];

  /** If present, details of the operation error. */
  error?: ErrorDetail;
}

/**
 * The default operationId parameter type.
 */
/** The default operationId parameter type. */
model OperationIdParameter {
  /** The ID of an ongoing async operation. */
  @path
  @minLength(1)
  operationId: string;
}

/**
 * Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.
 */
/** 
Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.
 */
union ActionType {
  /** Actions are for internal-only APIs. */
  Internal: "Internal",

  string,
}

/**
 * The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"
 */
/** 
The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"
 */
union Origin {
  /** Indicates the operation is initiated by a user. */
  user: "user",

  /** Indicates the operation is initiated by a system. */
  system: "system",

  /** Indicates the operation is initiated by a user or system. */
  `user,system`: "user,system",

  string,
}

/**
 * The error detail.
 */
/** The error detail. */
model ErrorDetail {
  /** The error code. */
  @visibility("read")
  code?: string;

  /** The error message. */
  @visibility("read")
  message?: string;

  /** The error target. */
  @visibility("read")
  target?: string;

  /** The error details. */
  @extension("x-ms-identifiers", ["message", "target"])
  @visibility("read")
  details?: ErrorDetail[];

  /** The error additional info. */
  @extension("x-ms-identifiers", ["message", "target"])
  @visibility("read")
  additionalInfo?: ErrorAdditionalInfo[];
}

/**
 * The resource management error additional info.
 */
/** The resource management error additional info. */
model ErrorAdditionalInfo {
  /** The additional info type. */
  @visibility("read")
  type?: string;

  /** The additional info. */
  @visibility("read")
  info?: {};
}

/**
 * Metadata pertaining to creation and last modification of the resource.
 */
/** Metadata pertaining to creation and last modification of the resource. */
model SystemData {
  /** The identity that created the resource. */
  @visibility("read")
  createdBy?: string;

  /** The type of identity that created the resource. */
  @visibility("read")
  createdByType?: createdByType;

  /** The type of identity that created the resource. */
  @visibility("read")
  createdAt?: plainDate;

  /** The identity that last modified the resource. */
  @visibility("read")
  lastModifiedBy?: string;

  /** The type of identity that last modified the resource. */
  @visibility("read")
  lastModifiedByType?: createdByType;

  /** The timestamp of resource last modification (UTC) */
  @visibility("read")
  lastModifiedAt?: plainDate;
}

/**
 * The kind of entity that created the resource.
 */
// NOTE: This is how the extensible enum is named in types.json
/** The kind of entity that created the resource. */
union createdByType {
  /** The entity was created by a user. */
  User: "User",

  /** The entity was created by an application. */
  Application: "Application",

  /** The entity was created by a managed identity. */
  ManagedIdentity: "ManagedIdentity",

  /** The entity was created by a key. */
  Key: "Key",

  string,
}

// /** Identity for the resource. */
// model Identity {
// principalId?: string;
// tenantId?: string;
// type?: enum {SystemAssigned}
// }

/**
 * Details of the resource plan.
 */
/** Details of the resource plan. */
model Plan {
  /** A user defined name of the 3rd Party Artifact that is being procured. */
  name: string;

  /** The publisher of the 3rd Party Artifact that is being bought. E.g. NewRelic */
  publisher: string;

  /** The 3rd Party artifact that is being procured. E.g. NewRelic. Product maps to the OfferID specified for the artifact at the time of Data Market onboarding. */
  product: string;

  /** A publisher provided promotion code as provisioned in Data Market for the said product/artifact. */
  promotionCode?: string;

  /** The version of the desired product/artifact. */
  version?: string;
}

/**
 * The check availability request body.
 */
/** The check availability request body. */
model CheckNameAvailabilityRequest {
  /** The name of the resource for which availability needs to be checked. */
  name?: string;

  /** The resource type. */
  type?: string;
}

/**
 * The check availability result.
 */
/** The check availability result. */
model CheckNameAvailabilityResponse {
  /** Indicates if the resource name is available. */
  nameAvailable?: boolean;

  /** The reason why the given name is not available. */
  reason?: CheckNameAvailabilityReason;

  /** Detailed reason why the given name is not available. */
  message?: string;
}

/**
 * Possible reasons for a name not being available.
 */
/** Possible reasons for a name not being available. */
union CheckNameAvailabilityReason {
  /** Name is invalid. */
  Invalid: "Invalid",

  /** Name already exists. */
  AlreadyExists: "AlreadyExists",

  string,
}
