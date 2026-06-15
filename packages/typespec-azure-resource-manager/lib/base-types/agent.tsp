import "./base-types.tsp";

using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes;
using Azure.ResourceManager.Private;
using TypeSpec.Rest;

namespace Azure.ResourceManager.BaseTypes.Agents;

// ============================================================================
// Agent Tool Types
// ============================================================================

/**
 * A tool binding for an agent (Appliance deployment model).
 * All properties are read-only (the appliance owns and reports state).
 */
model AgentToolTypeAppliance {
  /** Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. */
  @visibility(Lifecycle.Read)
  type: string;

  /** Tool name/identifier. */
  @visibility(Lifecycle.Read)
  name: string;
}

/**
 * A tool binding for an agent (Platform deployment model).
 * All properties have default visibility (the client owns these fields).
 */
model AgentToolTypePlatform {
  /** Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. */
  type: string;

  /** Tool name/identifier. */
  name: string;
}

// ============================================================================
// Agent Definition
// ============================================================================

/**
 * Inline agent definition describing the model and behavior of the agent.
 * This model is used only as a constraint for template parameters.
 */
internal model AgentDefinition {
  /** Model identifier (RP-defined). */
  `model`: string;
}

/**
 * Appliance deployment model of AgentDefinition.
 * Properties controlled by `@baseTypeOptional` are invisible when the corresponding
 * template parameter is false, or read-only when present.
 * @template HasModelDeploymentRef Whether the modelDeploymentRef property is present.
 * @template HasInstructions Whether the instructions property is present.
 */
model AgentDefinitionAppliance<
  HasModelDeploymentRef extends valueof boolean = false,
  HasInstructions extends valueof boolean = false
> {
  /** Model identifier (RP-defined). */
  @visibility(Lifecycle.Read)
  `model`: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  @baseTypeOptional(HasModelDeploymentRef, true)
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. */
  @baseTypeOptional(HasInstructions, true)
  instructions: string;
}

/**
 * Platform deployment model of AgentDefinition.
 * Properties controlled by `@baseTypeOptional` are invisible when the corresponding
 * template parameter is false, or have default visibility when present.
 * @template HasModelDeploymentRef Whether the modelDeploymentRef property is present.
 * @template HasInstructions Whether the instructions property is present.
 */
model AgentDefinitionPlatform<
  HasModelDeploymentRef extends valueof boolean = false,
  HasInstructions extends valueof boolean = false
> {
  /** Model identifier (RP-defined). */
  `model`: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  @baseTypeOptional(HasModelDeploymentRef, false)
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. */
  @baseTypeOptional(HasInstructions, false)
  instructions: string;
}

// ============================================================================
// Agent Properties (resource property bag)
// ============================================================================

/**
 * Required properties for an agent resource.
 * This model is used only as a constraint for template parameters.
 */
internal model AgentProperties {
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
 * All properties are read-only (the appliance owns and reports state).
 * @template HasModelDeploymentRef Whether the definition includes a modelDeploymentRef property.
 * @template HasInstructions Whether the definition includes an instructions property.
 */
model AgentPropertiesAppliance<
  HasModelDeploymentRef extends valueof boolean = false,
  HasInstructions extends valueof boolean = false
> {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** Human-friendly name. */
  @visibility(Lifecycle.Read)
  displayName: string;

  /** Purpose/behavior summary. */
  @visibility(Lifecycle.Read)
  description: string;

  /** Inline agent definition. */
  @visibility(Lifecycle.Read)
  definition: AgentDefinitionAppliance<HasModelDeploymentRef, HasInstructions>;

  /** Tool bindings. Read-only in the Appliance deployment model. */
  @visibility(Lifecycle.Read)
  tools?: AgentToolTypeAppliance[];
}

/**
 * Platform deployment model of AgentProperties.
 * Properties have default visibility (the client owns these fields).
 * baseTypes remains ARM-managed and read-only.
 * @template HasModelDeploymentRef Whether the definition includes a modelDeploymentRef property.
 * @template HasInstructions Whether the definition includes an instructions property.
 */
model AgentPropertiesPlatform<
  HasModelDeploymentRef extends valueof boolean = false,
  HasInstructions extends valueof boolean = false
> {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** Human-friendly name. */
  displayName: string;

  /** Purpose/behavior summary. */
  description: string;

  /** Inline agent definition. */
  definition: AgentDefinitionPlatform<HasModelDeploymentRef, HasInstructions>;

  /** Tool bindings. Writable in the Platform deployment model. */
  tools?: AgentToolTypePlatform[];
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
  createdAt?: unixTimestamp32;
}

/**
 * A single input message provided to the model.
 */
model InputMessage {
  /** The role of the message author (for example, user, system, or developer). */
  role: string;

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
  createdAt?: unixTimestamp32;

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
  role?: string;

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
