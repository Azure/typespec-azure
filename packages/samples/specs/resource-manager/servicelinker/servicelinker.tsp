import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service({
  title: "Microsoft.ServiceLinker provider",
  version: "2021-01-01-privatepreview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.ServiceLinker;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("The details of a service linker.")
model LinkerResource is ExtensionResource<LinkerProperties> {
  @doc("The name of the linker resource.")
  @path
  @key("linkerName")
  @segment("linkers")
  name: string;
}

@armResourceOperations
interface Linker extends ExtensionResourceOperations<LinkerResource, LinkerProperties> {
  @doc("Validate a linker resource.")
  @post
  @armResourceAction(LinkerResource)
  validateLinker(
    ...ExtensionResourceInstanceParameters<LinkerResource>,
  ): ArmResponse<ValidateResult> | ErrorResponse;

  @doc("List linker resource configurations.")
  @post
  @armResourceAction(LinkerResource)
  listConfigurations(
    ...ExtensionResourceInstanceParameters<LinkerResource>,
  ): ArmResponse<SourceConfigurationResult> | ErrorResponse;
}

@doc("The rp-specific properties of a resource link")
model LinkerProperties {
  @doc("The resource Id of the target service.")
  targetId: string;

  @doc("The authentication type.")
  authInfo: AuthInfoBase;

  ...DefaultProvisioningStateProperty;
}

@doc("The kind of authentication used for this linker.")
enum AuthType {
  @doc("System assigned identity")
  systemAssignedIdentity,

  @doc("User assigned identity")
  userAssignedIdentity,

  @doc("Service principal")
  servicePrincipal,

  @doc("Secret")
  secret,
}

@doc("The abstract base model for all authentication types.") // discriminator: authType
model AuthInfoBase {
  @doc("The authorization type")
  authType: AuthType;
}

// x-ms-discriminator-value: secret
@doc("Authentication information for secret-based auth.")
model SecretAuthInfo extends AuthInfoBase {
  @doc("username or account name for secret auth.")
  name: string;

  // @secret

  @doc("Password or account key for secret auth.")
  secret?: string;
}

// x-ms-discriminator-value: userAssignedIdentity
@doc("Authentication information for user assigned identity based auth.")
model UserAssignedIdentityAuthInfo extends AuthInfoBase {
  @doc("Client Id for userAssignedIdentity")
  id: string;
}

// x-ms-discriminator-value: systemAssignedIdentity
@doc("Authentication information for system assigned identity based auth.")
model SystemAssignedIdentityAuthInfo extends AuthInfoBase {}

// x-ms-discriminator-value: systemPrincipal
@doc("Authentication information for service principal based auth.")
model SystemPrincipalAuthInfo extends AuthInfoBase {
  @doc("ServicePrincipal Id for servicePrincipal auth.")
  id: string;

  @doc("ServicePrincipal Name for servicePrincipal auth.")
  name: string;
}

@doc("Source configuration details.")
model SourceConfiguration {
  @doc("The kind of configuration used in this instance.")
  type: SourceConfigurationType;

  @doc("The configuration of the linker for appSettings or connectionStrings or serviceBindings")
  linkConfig: {};
}

@doc("The kind of source configuration used in a particular instance.")
enum SourceConfigurationType {
  @doc("App settings")
  appSettings,

  @doc("Connection settings")
  connectionSettings,

  @doc("Service bindings")
  serviceBindings,
}

@doc("Configurations for source resource, include appSettings, connectionString and serviceBindings")
model SourceConfigurationResult {
  @OpenAPI.extension("x-ms-identifiers", [])
  @doc("Details of the source configurations.")
  sourceConfigurations: SourceConfiguration[];
}

@doc("State of the linker resource.")
enum LinkerStatus {
  @doc("Healthy")
  Healthy,

  @doc("Not healthy")
  `Not healthy`,
}

@doc("Details of validation.")
model ValidateResult {
  @doc("The linker name.")
  name: string;

  @doc("Specifies if the linker is healthy.")
  linkerStatus: LinkerStatus;

  @doc("The reason of the error.")
  reason: string;

  @doc("The start time of the validation report.")
  reportStartTimeUtc: plainDate;

  @doc("The end time of the validation report.")
  reportEndTimeUtc: plainDate;

  @doc("The resource Id of the target service.")
  targetId: string;

  @doc("The authentication type.")
  authType: AuthType;
}
