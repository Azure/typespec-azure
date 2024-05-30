using Azure.ResourceManager.CommonTypes;

namespace Azure.ResourceManager {
  // customer-managed-keys
  alias InfrastructureEncryption = CommonTypes.InfrastructureEncryption;
  alias KeyEncryptionIdentity = CommonTypes.KeyEncryptionKeyIdentity;
  alias KeyEncryptionKeyIdentity = CommonTypes.KeyEncryptionKeyIdentity;
  alias CustomerManagedKeyEncryption = CommonTypes.CustomerManagedKeyEncryption;
  alias EncryptionConfiguration = CommonTypes.EncryptionConfiguration;

  // private-links
  alias PrivateEndpoint = CommonTypes.PrivateEndpoint;
  alias PrivateEndpointConnection = CommonTypes.PrivateEndpointConnection;
  alias PrivateEndpointConnectionProperties = CommonTypes.PrivateEndpointConnectionProperties;
  alias PrivateLinkServiceConnectionState = CommonTypes.PrivateLinkServiceConnectionState;
  alias PrivateEndpointConnectionProvisioningState = CommonTypes.PrivateEndpointConnectionProvisioningState;
  alias PrivateEndpointServiceConnectionStatus = CommonTypes.PrivateEndpointServiceConnectionStatus;
  alias PrivateEndpointConnectionParameter = CommonTypes.PrivateEndpointConnectionParameter;
  alias PrivateLinkResourceParameter = CommonTypes.PrivateLinkResourceParameter;
}
