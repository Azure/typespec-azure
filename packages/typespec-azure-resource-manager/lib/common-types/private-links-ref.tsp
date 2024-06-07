import "./private-links.tsp";

using Azure.ResourceManager.CommonTypes.Private;

namespace Azure.ResourceManager.CommonTypes;

/** The private endpoint resource */
@@armCommonDefinition(PrivateEndpoint,
  "PrivateEndpoint",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "privatelinks.json"
);
@@armCommonDefinition(PrivateEndpoint,
  "PrivateEndpoint",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
);

/** Properties of he private endpoint connection resource */
@@armCommonDefinition(PrivateEndpointConnectionProperties,
  "PrivateEndpointConnectionProperties",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "privatelinks.json"
);
@@armCommonDefinition(PrivateEndpointConnectionProperties,
  "PrivateEndpointConnectionProperties",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
);

/** A collection of information about the state of the connection between service consumer and provider. */
@@armCommonDefinition(PrivateLinkServiceConnectionState,
  "PrivateLinkServiceConnectionState",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "privatelinks.json"
);
@@armCommonDefinition(PrivateLinkServiceConnectionState,
  "PrivateLinkServiceConnectionState",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
);

/** Properties of a private link resource. */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state" "Matches current common code"
@@armCommonDefinition(PrivateLinkResourceProperties,
  "PrivateLinkResourceProperties",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "privatelinks.json"
);
@@armCommonDefinition(PrivateLinkResourceProperties,
  "PrivateLinkResourceProperties",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
);

@@CommonTypes.Private.armCommonParameter(PrivateEndpointConnectionParameter.name,
  "PrivateEndpointConnectionName",
  #{ version: Azure.ResourceManager.CommonTypes.Versions.v4, isDefault: true },
  "privatelinks.json"
);
@@CommonTypes.Private.armCommonParameter(PrivateEndpointConnectionParameter.name,
  "PrivateEndpointConnectionName",
  Azure.ResourceManager.CommonTypes.Versions.v5,
  "privatelinks.json"
);
