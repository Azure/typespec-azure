import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service({
  title: "Azure Fluid Relay",
  version: "2021-03-12-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.FluidRelay;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A string that represents a URI.")
scalar Uri extends string;

@doc("The representation of a secret value, represented as a string on the wire")
@secret
scalar SecretKey extends string;

@doc("Details of the FluidRelay server.")
model FluidRelayServer is TrackedResource<FluidRelayServerProperties> {
  @path
  @key
  @doc("The resource name.")
  @segment("fluidRelayServers")
  name: string;
}

@armResourceOperations
interface FluidRelayServers
  extends TrackedResourceOperations<FluidRelayServer, FluidRelayServerProperties> {
  @doc("Regenerate the primary or secondary key for this server.")
  @post
  @armResourceAction(FluidRelayServer)
  regenerateKey(
    ...ResourceInstanceParameters<FluidRelayServer>,

    @doc("The details of the key generation request.")
    @body
    parameters: RegenerateKeyRequest,
  ): ArmResponse<FluidRelayServerKeys> | ErrorResponse;

  @doc("Retrieve the keys for this server.")
  @post
  @armResourceAction(FluidRelayServer)
  getKeys(
    ...ResourceInstanceParameters<FluidRelayServer>,
  ): ArmResponse<FluidRelayServerKeys> | ErrorResponse;
}

@doc("The properties of a Fluid Relay Service resource.")
model FluidRelayServerProperties {
  @doc("The Fluid tenantId for this server")
  @visibility("read")
  frsTenantId?: string;

  @doc("The Fluid service endpoints for this server.")
  @visibility("read")
  fluidRelayEndpoints?: FluidRelayEndpoints;

  @doc("Provisioning states for FluidRelay RP")
  provisioningState?: ProvisioningState;
}

@doc("Provisioning states for FluidRelay RP")
@Azure.Core.lroStatus
enum ProvisioningState {
  ...ResourceProvisioningState,
}

@doc("The Fluid Relay Service endpoints for this server.")
model FluidRelayEndpoints {
  @doc("The Fluid Relay Orderer Endpoints.")
  @visibility("read")
  ordererEndpoints?: Uri[];

  @doc("The Fluid Relay storage endpoints.")
  @visibility("read")
  storageEndpoints?: Uri[];
}

@doc("The set of available keys for this server.")
model FluidRelayServerKeys {
  @doc("The primary key for this server.")
  @visibility("read")
  key1?: SecretKey;

  @doc("The secondary key for this server.")
  @visibility("read")
  key2?: SecretKey;
}

@doc("The keys that are defined fro a FluidRelay Service.")
enum KeyName {
  @doc("Key 1")
  key1,

  @doc("Key 2")
  key2,
}

@doc("Specifies which key should be generated.")
model RegenerateKeyRequest {
  @doc("The key to regenerate.")
  keyName: KeyName;
}
