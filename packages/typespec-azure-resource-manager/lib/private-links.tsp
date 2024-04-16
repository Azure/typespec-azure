import "@typespec/openapi";
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

/** The private endpoint resource */
@armCommonDefinition(
  "PrivateEndpoint",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "privatelinks.json"
)
@armCommonDefinition(
  "PrivateEndpoint",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
)
model PrivateEndpoint {
  /** The resource identifier for private endpoint */
  id?: Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.Network/privateEndpoints";
    }
  ]>;
}

/** The private endpoint connection resource */
model PrivateEndpointConnection extends Azure.ResourceManager.Foundations.ProxyResourceBase {
  /** The private endpoint connection properties */
  properties?: PrivateEndpointConnectionProperties;
}

/** Properties of he private endpoint connection resource */
@armCommonDefinition(
  "PrivateEndpointConnectionProperties",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "privatelinks.json"
)
@armCommonDefinition(
  "PrivateEndpointConnectionProperties",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
)
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
@armCommonDefinition(
  "PrivateLinkServiceConnectionState",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "privatelinks.json"
)
@armCommonDefinition(
  "PrivateLinkServiceConnectionState",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
)
model PrivateLinkServiceConnectionState {
  /** Indicates whether the connection has been Approved/Rejected/Removed by the owner of the service. */
  status?: PrivateEndpointServiceConnectionStatus;

  /** The reason for approval/rejection of the connection. */
  description?: string;

  /** A message indicating if changes on the service provider require any updates on the consumer. */
  actionsRequired?: string;
}

/** The provisioning state of the connection */
enum PrivateEndpointConnectionProvisioningState {
  ...ResourceProvisioningState,

  /** Connection is being created */
  Creating,

  /** Connection is being deleted */
  Deleting,
}

/** The private endpoint connection status */
enum PrivateEndpointServiceConnectionStatus {
  /** Connectionaiting for approval or rejection */
  Pending,

  /** Connection approved */
  Approved,

  /** Connection Rejected */
  Rejected,
}

model PrivateLinkResource extends Azure.ResourceManager.Foundations.ProxyResourceBase {
  /** Properties of the private link resource. */
  properties?: PrivateLinkResourceProperties;
}

/** Properties of a private link resource. */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state" "Matches current common code"
@armCommonDefinition(
  "PrivateLinkResourceProperties",
  {
    version: Azure.ResourceManager.CommonTypes.Versions.v4,
    isDefault: true,
  },
  "privatelinks.json"
)
@armCommonDefinition(
  "PrivateLinkResourceProperties",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
)
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

/** List of private endpoint connections associated with the specified resource. */
model PrivateEndpointConnectionResourceListResult {
  /** Array of private endpoint connections */
  value?: PrivateEndpointConnection[];
}

/** A list of private link resources. */
model PrivateLinkResourceListResult {
  /** Array of private link resources */
  value?: PrivateLinkResource[];
}

/**
 * The name of the private endpoint connection associated with the Azure resource.
 * @template Segment The resource type name for private endpoint connections (default is privateEndpointConnections)
 */
model PrivateEndpointConnectionParameter<Segment extends valueof string = "privateEndpointConnections"> {
  /** The name of the private endpoint connection associated with the Azure resource. */
  @path
  @armCommonParameter(
    "PrivateEndpointConnectionName",
    {
      version: Azure.ResourceManager.CommonTypes.Versions.v4,
      isDefault: true,
    },
    "privatelinks.json"
  )
  @armCommonParameter(
    "PrivateEndpointConnectionName",
    Azure.ResourceManager.CommonTypes.Versions.v5,
    "privatelinks.json"
  )
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
