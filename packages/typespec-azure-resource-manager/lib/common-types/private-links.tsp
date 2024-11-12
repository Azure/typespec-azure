using TypeSpec.Http;
using TypeSpec.Versioning;
using OpenAPI;

using Azure.Core;

namespace Azure.ResourceManager.CommonTypes;

/** The Private Endpoint resource. */
model PrivateEndpoint {
  /** The resource identifier for private endpoint */
  @visibility("read")
  @typeChangedFrom(CommonTypes.Versions.v4, string)
  id?: Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.Network/privateEndpoints";
    }
  ]>;
}

/** A private link resource. */
model PrivateLinkResource extends Resource {
  /** Resource properties. */
  properties?: PrivateLinkResourceProperties;
}

/** Properties of a private link resource. */
model PrivateLinkResourceProperties {
  /** The private link resource group id. */
  @visibility("read")
  groupId?: string;

  /** The private link resource required member names. */
  @visibility("read")
  requiredMembers?: string[];

  /** The private link resource private link DNS zone name. */
  requiredZoneNames?: string[];
}

/** A list of private link resources. */
@added(Versions.v6)
@pagedResult
model PrivateLinkResourceListResult {
  /** Array of private link resources */
  value?: PrivateLinkResource[];

  /** URL to get the next set of operation list results (if there are any). */
  @visibility("read")
  nextLink?: string;
}
//#region
/** The private endpoint connection resource */
model PrivateEndpointConnection extends Resource {
  /** The private endpoint connection properties */
  properties?: PrivateEndpointConnectionProperties;
}

/** List of private endpoint connections associated with the specified resource. */
@added(Versions.v6)
@pagedResult
model PrivateEndpointConnectionListResult {
  /** Array of private endpoint connections. */
  value?: PrivateEndpointConnection[];

  /** URL to get the next set of operation list results (if there are any). */
  @visibility("read")
  nextLink?: string;
}

/** Properties of the private endpoint connection. */
model PrivateEndpointConnectionProperties {
  /** The group ids for the private endpoint resource. */
  @visibility("read")
  @added(Versions.v4)
  groupIds?: string[];

  /** The private endpoint resource. */
  privateEndpoint?: PrivateEndpoint;

  /** A collection of information about the state of the connection between service consumer and provider. */
  privateLinkServiceConnectionState: PrivateLinkServiceConnectionState;

  /** The provisioning state of the private endpoint connection resource. */
  @visibility("read")
  provisioningState?: PrivateEndpointConnectionProvisioningState;
}

/** A collection of information about the state of the connection between service consumer and provider. */
model PrivateLinkServiceConnectionState {
  /** Indicates whether the connection has been Approved/Rejected/Removed by the owner of the service. */
  status?: PrivateEndpointServiceConnectionStatus;

  /** The reason for approval/rejection of the connection. */
  description?: string;

  /** A message indicating if changes on the service provider require any updates on the consumer. */
  actionsRequired?: string;
}

/** The current provisioning state. */
union PrivateEndpointConnectionProvisioningState {
  string,

  /** Connection has been provisioned */
  Succeeded: "Succeeded",

  /** Connection is being created */
  Creating: "Creating",

  /** Connection is being deleted */
  Deleting: "Deleting",

  /** Connection provisioning has failed */
  Failed: "Failed",
}

/** The private endpoint connection status. */
union PrivateEndpointServiceConnectionStatus {
  /** Connectionaiting for approval or rejection */
  Pending: "Pending",

  /** Connection approved */
  Approved: "Approved",

  /** Connection Rejected */
  Rejected: "Rejected",

  string,
}

/**
 * The name of the private endpoint connection associated with the Azure resource.
 * @template Segment The resource type name for private endpoint connections (default is privateEndpointConnections)
 */
model PrivateEndpointConnectionParameter<Segment extends valueof string = "privateEndpointConnections"> {
  /** The name of the private endpoint connection associated with the Azure resource. */
  @path
  @TypeSpec.Rest.segment(Segment)
  @key("privateEndpointConnectionName")
  name: string;
}

/**
 * The name of the private link associated with the Azure resource.
 * @template Segment The resource type name for private links (default is privateLinkResources)
 */
model PrivateLinkResourceParameter<Segment extends valueof string = "privateLinkResources"> {
  /** The name of the private link associated with the Azure resource. */
  @path
  @TypeSpec.Rest.segment(Segment)
  @key("privateLinkResourcenName")
  name: string;
}

/**
 * Model representing the standard `PrivateLinkResourceListResult` envelope for version v3,v4 and v5, it has been deprecated for v6 and beyond.
 *
 * Please note that this is only intended to use on versions before v6, do not use this if you are already on CommonTypes.Version.v6 or beyond.
 *
 * If you are mitrating to v6 or above, use `PrivateLinkResourceListResult` directly.
 *
 *  @example
 *  Version: v3,v4,v5
 * ```typespec
 * @armResourceOperations
 * interface Employees {
 *   listConnections is ArmResourceActionAsync<Employee, {}, PrivateLinkResourceListResultV5>;
 * }
 * ```
 *
 * Version: v6
 * ```typespec
 * @armResourceOperations
 * interface Employees {
 *   listConnections is ArmResourceActionAsync<Employee, {}, PrivateLinkResourceListResult>;
 * }
 * ```
 */
#deprecated "Avoid using this model. Instead, use PrivateLinkResourceListResult available in CommonTypes.Version.v6 or beyond."
@friendlyName("PrivateLinkResourceListResult")
@removed(Versions.v6)
model PrivateLinkResourceListResultV5 {
  /** Array of private link resources */
  value?: CommonTypes.PrivateLinkResource[];
}

/**
 * Model representing the standard `PrivateEndpointConnectionResourceListResult` envelope for version v3,v4 and v5, it has been deprecated for v6 and beyond.
 *
 * Please note that this is only intended to use on versions before v6, do not use this if you are already on CommonTypes.Version.v6 or beyond.
 *
 * If you are mitrating to v6 or above, use `PrivateEndpointConnectionResourceListResult` directly.
 *
 * @example
 * Version: v3,v4,v5
 * ```typespec
 * @armResourceOperations
 * interface Employees {
 *   createConnection is ArmResourceActionAsync<
 *     Employee,
 *     PrivateEndpointConnection,
 *     PrivateEndpointConnectionResourceListResultV5
 *   >;
 * }
 * ```
 *
 * Version: v6
 * ```typespec
 * @armResourceOperations
 * interface Employees {
 *   createConnection is ArmResourceActionAsync<
 *     Employee,
 *     PrivateEndpointConnection,
 *     PrivateEndpointConnectionResourceListResult
 *   >;
 * }
 * ```
 */
#deprecated "Avoid using this model. Instead, use PrivateEndpointConnectionResourceListResult available in CommonTypes.Version.v6 or beyond."
@friendlyName("PrivateEndpointConnectionListResult")
@removed(Versions.v6)
model PrivateEndpointConnectionListResultV5 {
  /** Array of private endpoint connections. */
  value?: CommonTypes.PrivateEndpointConnection[];
}
