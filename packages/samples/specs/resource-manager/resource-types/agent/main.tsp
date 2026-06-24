import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes;
using Azure.ResourceManager.BaseTypes.Agents;

/** Contoso Agent Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoAgentProviderClient" })
@versioned(Versions)
namespace Microsoft.ContosoAgent;

/** Contoso Agent API versions */
enum Versions {
  /** 2024-06-01 version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2024-06-01`,
}

// ============================================================================
// Agent Definition models
// ============================================================================

// AgentDefinitionAppliance: Use for the Appliance deployment model where the service
// owns and reports agent configuration. All definition fields are read-only.
// AgentDefinitionPlatform: Use for the Platform deployment model where the client
// owns and manages agent configuration. Definition fields are writable.
// Template params control optional definition fields:
//   HasModelDeploymentRef: include a modelDeploymentRef property
//   HasInstructions: include an instructions property

// Appliance definition: read-only fields managed by the service
model ContosoApplianceDefinition is AgentDefinitionAppliance<true, true>;

// Platform definition: writable fields managed by the client
model ContosoPlatformDefinition is AgentDefinitionPlatform<true, true>;

// ============================================================================
// Agent Properties models
// ============================================================================

// AgentPropertiesAppliance: Use when the service owns and manages the agent lifecycle.
// All properties are read-only. The RP reports state; clients cannot modify it directly.
// AgentPropertiesPlatform: Use when the client owns and manages the agent configuration.
// Properties are writable (except baseTypes, which is always ARM-managed and read-only).

// Appliance agent properties: service-managed, read-only
model ContosoApplianceAgentProperties is AgentPropertiesAppliance<ContosoApplianceDefinition> {
  ...DefaultProvisioningStateProperty;
}

// Platform agent properties: client-managed, writable
model ContosoPlatformAgentProperties is AgentPropertiesPlatform<ContosoPlatformDefinition> {
  ...DefaultProvisioningStateProperty;
}

// ============================================================================
// Agent Resource models
// ============================================================================

// The Agent template creates an ARM TrackedResource with the @azureBaseType decorator.
// Each agent resource requires a ResourceNameParameter spread for the key/segment.

// Appliance-deployed agent (service manages configuration)
#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model ContosoApplianceAgent is Agent<ContosoApplianceAgentProperties> {
  ...ResourceNameParameter<ContosoApplianceAgent>;
}

// Platform-deployed agent (client manages configuration)
#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model ContosoPlatformAgent is Agent<ContosoPlatformAgentProperties> {
  ...ResourceNameParameter<ContosoPlatformAgent>;
}

// ============================================================================
// Conversation and Response child resources
// ============================================================================

// Conversation and Response are required proxy child resources of an Agent.
// Each must have full CRUD lifecycle operations (create, read, update, delete).
// ConversationProperties and ResponseProperties provide the base fields;
// extend them with RP-specific properties as needed.

// RP-specific conversation properties (shared by both agents in this sample)
model ContosoConversationProperties is ConversationProperties {
  ...DefaultProvisioningStateProperty;

  /** System prompt / behavioral instructions for this conversation. */
  instructions?: string;
}

// RP-specific response properties (shared by both agents in this sample)
model ContosoResponseProperties is ResponseProperties {
  ...PreviousResponseProperty;
  ...DefaultProvisioningStateProperty;
}

@@visibility(ContosoResponseProperties.previousResponseId, Lifecycle.Read);

// Conversation proxy child resource of the Appliance agent
model ApplianceConversation is AgentConversation<
  ContosoConversationProperties,
  ContosoApplianceAgent
> {
  ...ResourceNameParameter<ApplianceConversation>;
}

// Response proxy child resource of the Appliance agent
model ApplianceResponse is AgentResponse<ContosoResponseProperties, ContosoApplianceAgent> {
  ...ResourceNameParameter<ApplianceResponse>;
}

// Conversation proxy child resource of the Platform agent
model PlatformConversation is AgentConversation<
  ContosoConversationProperties,
  ContosoPlatformAgent
> {
  ...ResourceNameParameter<PlatformConversation>;
}

// Response proxy child resource of the Platform agent
model PlatformResponse is AgentResponse<ContosoResponseProperties, ContosoPlatformAgent> {
  ...ResourceNameParameter<PlatformResponse>;
}

// ============================================================================
// Operations interfaces
// ============================================================================

interface Operations extends Azure.ResourceManager.Operations {}

// ARM resource operations use operation templates for standard CRUD patterns.
// See: https://azure.github.io/typespec-azure/docs/howtos/arm/resource-operations/

// Appliance agent operations
@armResourceOperations
interface ApplianceAgents {
  get is ArmResourceRead<ContosoApplianceAgent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ContosoApplianceAgent>;
  update is ArmTagsPatchSync<ContosoApplianceAgent>;
  delete is ArmResourceDeleteWithoutOkAsync<ContosoApplianceAgent>;
  listBySubscription is ArmListBySubscription<ContosoApplianceAgent>;
  listByResourceGroup is ArmResourceListByParent<ContosoApplianceAgent>;
}

// Platform agent operations
@armResourceOperations
interface PlatformAgents {
  get is ArmResourceRead<ContosoPlatformAgent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ContosoPlatformAgent>;
  update is ArmTagsPatchSync<ContosoPlatformAgent>;
  delete is ArmResourceDeleteWithoutOkAsync<ContosoPlatformAgent>;
  listBySubscription is ArmListBySubscription<ContosoPlatformAgent>;
  listByResourceGroup is ArmResourceListByParent<ContosoPlatformAgent>;
}

// Conversation and Response proxy child resources require create, read, update, and
// delete lifecycle operations. Omitting any of these will trigger the
// arm-agent-base-type-lifecycle-operations linting rule.
// See: https://azure.github.io/typespec-azure/docs/howtos/arm/resource-operations/

// Appliance conversation operations (CRUD required)
@armResourceOperations
interface ApplianceConversations {
  get is ArmResourceRead<ApplianceConversation>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ApplianceConversation>;
  update is ArmCustomPatchSync<
    ApplianceConversation,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      ApplianceConversation,
      ContosoConversationProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<ApplianceConversation>;
  listByAgent is ArmResourceListByParent<ApplianceConversation>;
}

// Appliance response operations (CRUD required)
@armResourceOperations
interface ApplianceResponses {
  get is ArmResourceRead<ApplianceResponse>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ApplianceResponse>;
  update is ArmCustomPatchSync<
    ApplianceResponse,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      ApplianceResponse,
      ContosoResponseProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<ApplianceResponse>;
  listByAgent is ArmResourceListByParent<ApplianceResponse>;
}

// Platform conversation operations (CRUD required)
@armResourceOperations
interface PlatformConversations {
  get is ArmResourceRead<PlatformConversation>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<PlatformConversation>;
  update is ArmCustomPatchSync<
    PlatformConversation,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      PlatformConversation,
      ContosoConversationProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<PlatformConversation>;
  listByAgent is ArmResourceListByParent<PlatformConversation>;
}

// Platform response operations (CRUD required)
@armResourceOperations
interface PlatformResponses {
  get is ArmResourceRead<PlatformResponse>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<PlatformResponse>;
  update is ArmCustomPatchSync<
    PlatformResponse,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      PlatformResponse,
      ContosoResponseProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<PlatformResponse>;
  listByAgent is ArmResourceListByParent<PlatformResponse>;
}
