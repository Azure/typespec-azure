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

/** RP-specific properties for the Contoso agent (Platform deployment model) */
model ContosoAgentProperties is AgentPropertiesPlatform {
  ...DefaultProvisioningStateProperty;
}

/** RP-specific properties for conversations */
model ContosoConversationProperties is ConversationProperties {
  ...DefaultProvisioningStateProperty;
  ...AgentInstructionsProperty;
}

/** RP-specific properties for responses */
model ContosoResponseProperties is ResponseProperties {
  ...PreviousResponseProperty;
  ...DefaultProvisioningStateProperty;
}

@@visibility(ContosoResponseProperties.previous_response_id, Lifecycle.Read);

/** A Contoso Agent resource */
model ContosoAgent is Agent<ContosoAgentProperties> {
  ...ResourceNameParameter<ContosoAgent>;
}

/** A conversation child resource */
model ContosoConversation is AgentConversation<ContosoConversationProperties, ContosoAgent> {
  ...ResourceNameParameter<ContosoConversation>;
}

/** A response child resource */
model ContosoResponse is AgentResponse<ContosoResponseProperties, ContosoAgent> {
  ...ResourceNameParameter<ContosoResponse>;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface ContosoAgents {
  get is ArmResourceRead<ContosoAgent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ContosoAgent>;
  update is ArmTagsPatchSync<ContosoAgent>;
  delete is ArmResourceDeleteWithoutOkAsync<ContosoAgent>;
  listBySubscription is ArmListBySubscription<ContosoAgent>;
  listByResourceGroup is ArmResourceListByParent<ContosoAgent>;
}

@armResourceOperations
interface Conversations {
  get is ArmResourceRead<ContosoConversation>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ContosoConversation>;
  update is ArmCustomPatchSync<
    ContosoConversation,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      ContosoConversation,
      ContosoConversationProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<ContosoConversation>;
  listByAgent is ArmResourceListByParent<ContosoConversation>;
}

@armResourceOperations
interface Responses {
  get is ArmResourceRead<ContosoResponse>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ContosoResponse>;
  update is ArmCustomPatchSync<
    ContosoResponse,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      ContosoResponse,
      ContosoResponseProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<ContosoResponse>;
  listByAgent is ArmResourceListByParent<ContosoResponse>;
}
