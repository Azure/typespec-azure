import "./base-types.tsp";

using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes;
using TypeSpec.Rest;

namespace Azure.ResourceManager.BaseTypes.Agents;

// ============================================================================
// Agent Tool Types
// ============================================================================

/**
 * A tool binding for an agent, aligned with Azure AI Foundry-style tool bindings.
 */
model AgentToolTypeEntry {
  /** Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. */
  type: string;

  /** Tool name/identifier. */
  name: string;
}

/**
 * Mix-in for agent tool properties.
 * @template ToolType The type of tool entries. Defaults to AgentToolTypeEntry.
 */
model AgentToolProperty<ToolType extends AgentToolTypeEntry = AgentToolTypeEntry> {
  /** Tool bindings for the agent. */
  tools?: ToolType[];
}

// ============================================================================
// Agent Definition
// ============================================================================

/**
 * Inline agent definition describing the model and behavior of the agent.
 * Contains properties shared across all deployment models.
 */
model AgentDefinition {
  /** Model identifier (RP-defined). */
  `model`: string;
}

/**
 * Appliance deployment model of AgentDefinition.
 * Extends the base definition with additional read-only properties
 * (the appliance owns and reports state; the client does not set these fields).
 */
model AgentDefinitionAppliance {
  ...AgentDefinition;

  /** Optional RP-specific reference to an underlying model deployment. */
  @visibility(Lifecycle.Read)
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. */
  @visibility(Lifecycle.Read)
  instructions?: string;
}

/**
 * Platform deployment model of AgentDefinition.
 * Extends the base definition with additional writable properties
 * (the client owns these fields).
 */
model AgentDefinitionPlatform {
  ...AgentDefinition;

  /** Optional RP-specific reference to an underlying model deployment. */
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. */
  instructions: string;
}

/** Mix-in for the model deployment reference property. */
model ModelDeploymentRefProperty {
  /** Optional RP-specific reference to an underlying model deployment. */
  modelDeploymentRef?: string;
}

/** Mix-in for agent instructions. */
model AgentInstructionsProperty {
  /** System prompt / behavioral instructions. */
  instructions: string;
}

// ============================================================================
// Agent Properties (resource property bag)
// ============================================================================

/**
 * Required properties for an agent resource.
 * Contains properties shared across all deployment models.
 * Resource providers implementing the Agent base type must include these
 * properties in their resource property bag.
 */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state" ""
model AgentProperties {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** Human-friendly name. */
  displayName: string;

  /** Purpose/behavior summary. */
  description: string;

  /** Inline agent definition. */
  definition: AgentDefinition;
}

/**
 * Appliance deployment model of AgentProperties.
 * Extends the base properties with additional read-only properties
 * (the appliance owns and reports state; the client does not set these fields).
 */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state" ""
model AgentPropertiesAppliance {
  ...AgentProperties;

  /** Tool bindings. Read-only in the Appliance deployment model. */
  @visibility(Lifecycle.Read)
  tools?: AgentToolTypeEntry[];
}

/**
 * Platform deployment model of AgentProperties.
 * Extends the base properties with additional writable properties
 * (the client owns these fields). baseTypes remains ARM-managed and read-only.
 */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state" ""
model AgentPropertiesPlatform {
  ...AgentProperties;

  /** Tool bindings. Writable in the Platform deployment model. */
  tools?: AgentToolTypeEntry[];
}

// ============================================================================
// Conversation Types
// ============================================================================

/**
 * Properties for a conversation resource holding the items and metadata
 * exchanged between a client and an agent.
 */
model ConversationProperties {
  /** Unique conversation identifier. Read-only (set by the service on creation). */
  @visibility(Lifecycle.Read)
  conversationId?: string;

  /** Timestamp of when the conversation was created. Read-only. */
  @visibility(Lifecycle.Read)
  createdAt?: utcDateTime;
}

/** Roles for agent messages. */
union AgentRole {
  /** The user role. */
  User: "user",

  /** A developer role. */
  Developer: "developer",

  /** An assistant role. */
  Assistant: "assistant",

  string,
}

/**
 * A single input message provided to the model.
 */
model InputMessage {
  /** The role of the message author (for example, user, system, or developer). */
  role: AgentRole;

  /** The content of the input message. */
  content: string;
}

/** Mix-in for input type discriminator. */
model InputTypeProperty {
  /** The input type discriminator. */
  type?: string = "message";
}

/** Output from a conversation. */
model ConversationOutput {
  /** The output identifier. */
  id: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * The status of a response.
 */
@Azure.Core.lroStatus
union ResponseStatus {
  /** The response completed successfully. */
  @Azure.Core.lroSucceeded
  Completed: "completed",

  /** The response failed. */
  @Azure.Core.lroFailed
  Failed: "failed",

  /** The response was cancelled. */
  @Azure.Core.lroCanceled
  Cancelled: "cancelled",

  /** The response is incomplete. */
  Incomplete: "incomplete",

  /** The response is queued for execution. */
  Queued: "queued",

  /** The response is in progress. */
  InProgress: "in_progress",

  string,
}

/**
 * Properties for a response generated by an agent for a given input,
 * including its output, status, and usage.
 */
model ResponseProperties {
  /** Unique response identifier. Read-only (set by the service). */
  @visibility(Lifecycle.Read)
  responseId?: string;

  /** Timestamp of when the response was created. Read-only. */
  @visibility(Lifecycle.Read)
  createdAt?: utcDateTime;

  /** Model ID used to generate the response. May be specified on request to override the agent default; read-only in GET. */
  `model`?: string;

  /** The status of the response. Read-only. */
  @visibility(Lifecycle.Read)
  status?: ResponseStatus;

  /** Content input to the model. Required on create. */
  input: InputMessage;
}

/**
 * An item produced in the response output, such as a message or tool call.
 */
model ResponseOutputItem {
  /** Unique identifier of the output item. */
  @visibility(Lifecycle.Read)
  id?: string;

  /** The output item type (for example, message or tool call). */
  @visibility(Lifecycle.Read)
  type?: string;

  /** The role associated with the output item. */
  @visibility(Lifecycle.Read)
  role?: AgentRole;

  /** The status of the output item. */
  @visibility(Lifecycle.Read)
  status?: ResponseStatus;

  /** The content of the output item. */
  @visibility(Lifecycle.Read)
  content?: string;
}

/** Mix-in for the output property. */
model ResponseOutputProperty {
  /** Output items (messages, tool calls, etc.). Read-only. */
  @visibility(Lifecycle.Read)
  output: ResponseOutputItem[];
}

/** Mix-in for the previous_response_id property. */
model PreviousResponseProperty {
  /** ID of a previous response for multi-turn chaining. Writable on create. */
  #suppress "@azure-tools/typespec-azure-core/casing-style" "Wire property name"
  previous_response_id?: string;
}

/** Mix-in for response instructions. */
model ResponseInstructionsProperty {
  /** System/developer message for this response. Writable on create; overrides agent-level instructions for this invocation. */
  instructions?: string;
}

// ============================================================================
// Resource Templates
// ============================================================================

/**
 * Model template for an Agent tracked resource.
 * Applies the Agent base type decorator automatically.
 * @template Properties RP-specific properties for the agent (must extend AgentProperties)
 */
@azureBaseType(#{ baseType: "Agent", version: "2024-06-01" })
model Agent<Properties extends AgentProperties> is TrackedResource<Properties>;

/**
 * Model template for a Conversation child resource of an Agent.
 * @template Properties RP-specific properties for the conversation (must extend ConversationProperties)
 * @template AgentResource The parent Agent resource type
 */
@parentResource(AgentResource)
model AgentConversation<
  Properties extends ConversationProperties,
  AgentResource extends Foundations.Resource
> is ProxyResource<Properties>;

/**
 * Model template for a Response child resource of an Agent.
 * @template Properties RP-specific properties for the response (must extend ResponseProperties)
 * @template AgentResource The parent Agent resource type
 */
@parentResource(AgentResource)
model AgentResponse<
  Properties extends ResponseProperties,
  AgentResource extends Foundations.Resource
> is ProxyResource<Properties>;
