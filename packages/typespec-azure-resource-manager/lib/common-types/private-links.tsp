using TypeSpec.Http;
using TypeSpec.Versioning;

namespace Azure.ResourceManager.CommonTypes;

/** The private endpoint resource */
@added(CommonTypes.Versions.v4)
model PrivateEndpoint {
  /** The resource identifier for private endpoint */
  id?: Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.Network/privateEndpoints";
    }
  ]>;
}

/** The private endpoint connection resource */
@added(CommonTypes.Versions.v4)
model PrivateEndpointConnection extends Azure.ResourceManager.Foundations.ProxyResource {
  /** The private endpoint connection properties */
  properties?: PrivateEndpointConnectionProperties;
}

/** Properties of he private endpoint connection resource */
@added(CommonTypes.Versions.v4)
model PrivateEndpointConnectionProperties {
  /** The group identifiers for the private endpoint resource */
  @visibility("read")
  groupIds?: string[];

  /** The private endpoint resource */
  privateEndpoint?: PrivateEndpoint;

  /** A collection of information about the state of the connection between service consumer and provider. */
  privateLinkServiceConnectionState: PrivateLinkServiceConnectionState;

  /** The provisioning state of the private endpoint connection resource. */
  provisioningState?: PrivateEndpointConnectionProvisioningState;
}

/** A collection of information about the state of the connection between service consumer and provider. */
@added(CommonTypes.Versions.v4)
model PrivateLinkServiceConnectionState {
  /** Indicates whether the connection has been Approved/Rejected/Removed by the owner of the service. */
  status?: PrivateEndpointServiceConnectionStatus;

  /** The reason for approval/rejection of the connection. */
  description?: string;

  /** A message indicating if changes on the service provider require any updates on the consumer. */
  actionsRequired?: string;
}

/** The provisioning state of the connection */
@added(CommonTypes.Versions.v4)
union PrivateEndpointConnectionProvisioningState {
  ResourceProvisioningState,

  /** Connection is being created */
  Creating: "Creating",

  /** Connection is being deleted */
  Deleting: "Deleting",
}

/** The private endpoint connection status */
@added(CommonTypes.Versions.v4)
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
@added(CommonTypes.Versions.v4)
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
@added(CommonTypes.Versions.v4)
model PrivateLinkResourceParameter<Segment extends valueof string = "privateLinkResources"> {
  /** The name of the private link associated with the Azure resource. */
  @path
  @TypeSpec.Rest.segment(Segment)
  @key("privateLinkResourcenName")
  name: string;
}
