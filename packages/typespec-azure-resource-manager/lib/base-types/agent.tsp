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

  /** System prompt / behavioral instructions for the agent. */
  instructions: string;
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

  /** System prompt / behavioral instructions for the agent. */
  @baseTypeOptional(HasInstructions, true)
  instructions: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  @baseTypeOptional(HasModelDeploymentRef, true)
  modelDeploymentRef?: string;
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

  /** System prompt / behavioral instructions for the agent. */
  @baseTypeOptional(HasInstructions, false)
  instructions: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  @baseTypeOptional(HasModelDeploymentRef, false)
  modelDeploymentRef?: string;
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

  /** Inline agent definition (must extend AgentDefinition). */
  definition: AgentDefinition;
}

/**
 * Appliance deployment model of AgentProperties.
 * All properties are read-only (the appliance owns and reports state).
 * @template AgentDefinitionType The user-defined agent definition model (must extend AgentDefinition).
 */
model AgentPropertiesAppliance<AgentDefinitionType extends AgentDefinition> {
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
  definition: AgentDefinitionType;

  /** Tool bindings. Read-only in the Appliance deployment model. */
  @visibility(Lifecycle.Read)
  tools?: AgentToolTypeAppliance[];
}

/**
 * Platform deployment model of AgentProperties.
 * Properties have default visibility (the client owns these fields).
 * baseTypes remains ARM-managed and read-only.
 * @template AgentDefinitionType The user-defined agent definition model (must extend AgentDefinition).
 */
model AgentPropertiesPlatform<AgentDefinitionType extends AgentDefinition> {
  /** ARM-managed. Must include the base type descriptor for this resource. */
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  /** Human-friendly name. */
  displayName: string;

  /** Purpose/behavior summary. */
  description: string;

  /** Inline agent definition. */
  definition: AgentDefinitionType;

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
  /** Timestamp of when the conversation was created. Read-only. */
  @visibility(Lifecycle.Read)
  createdAt?: utcDateTime;
}

/**
 * The role of the author of a message item.
 */
enum MessageRole {
  /** A developer-authored instruction message. */
  Developer,

  /** A message authored by the end user. */
  User,

  /** A message generated by the assistant (agent). */
  Assistant,

  /** A message representing the output of a tool. */
  Tool,
}

/**
 * The type of an item exchanged within a conversation or produced in a response.
 */
enum ItemType {
  /** A message authored by a developer, user, assistant, or tool. */
  Message,

  /** A function (tool) call requested by the model. */
  FunctionCall,

  /** The output produced by a function (tool) call. */
  FunctionCallOutput,

  /** A compaction item summarizing earlier conversation history. */
  Compaction,
}

/**
 * A single item exchanged within a conversation.
 *
 * The `type` discriminator selects the item variant. Only the fields relevant to
 * that variant are populated, so all variant-specific fields are optional:
 *   - `Message`: `role`, `content`
 *   - `FunctionCall`: `callId`, `name`, `arguments`
 *   - `FunctionCallOutput`: `callId`, `output`
 *   - `Compaction`: `summary`
 */
model ConversationItem {
  /** Unique identifier of the item. Read-only (assigned by the service). */
  @visibility(Lifecycle.Read)
  id?: string;

  /** The item type discriminator. Determines which variant this item represents. */
  type: ItemType;

  /** The role of the message author. Applies to `Message` items. */
  role?: MessageRole;

  /** The text content of the message. Applies to `Message` items. */
  content?: string;

  /** Identifier correlating a function call with its output. Applies to `FunctionCall` and `FunctionCallOutput` items. */
  callId?: string;

  /** The name of the function (tool) to invoke. Applies to `FunctionCall` items. */
  name?: string;

  /** Named arguments passed to the function (tool), keyed by parameter name. Applies to `FunctionCall` items. */
  arguments?: Record<unknown>;

  /** The output produced by the function (tool) call. Applies to `FunctionCallOutput` items. */
  output?: string;

  /** Summary of the compacted conversation history. Applies to `Compaction` items. */
  summary?: string;

  /** The status of the item. Read-only. */
  @visibility(Lifecycle.Read)
  status?: ResponseStatus;
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
  Completed: "Completed",

  /** The response failed. */
  @Azure.Core.lroFailed
  Failed: "Failed",

  /** The response was cancelled. */
  @Azure.Core.lroCanceled
  Cancelled: "Cancelled",

  /** The response is incomplete. */
  Incomplete: "Incomplete",

  /** The response is queued for execution. */
  Queued: "Queued",

  /** The response is in progress. */
  InProgress: "InProgress",

  string,
}

/**
 * Properties for a response generated by an agent for a given input,
 * including its output, status, and usage.
 */
model ResponseProperties {
  /** Timestamp of when the response was created. Read-only. */
  @visibility(Lifecycle.Read)
  createdAt?: utcDateTime;

  /** Model ID used to generate the response. May be specified on request to override the agent default; read-only in GET. */
  `model`?: string;

  /** The status of the response. Read-only. */
  @visibility(Lifecycle.Read)
  status?: ResponseStatus;

  /** Content input to the model. Required on create. */
  input: ConversationItem;
}

/**
 * An item produced in the response output, such as a message or tool call.
 *
 * The `type` discriminator selects the item variant. Only the fields relevant to
 * that variant are populated, so all variant-specific fields are optional:
 *   - `Message`: `role`, `content`
 *   - `FunctionCall`: `callId`, `name`, `arguments`
 *   - `FunctionCallOutput`: `callId`, `output`
 *   - `Compaction`: `summary`
 */
model ResponseItem {
  /** Unique identifier of the output item. Read-only. */
  @visibility(Lifecycle.Read)
  id?: string;

  /** The item type discriminator. Read-only. */
  @visibility(Lifecycle.Read)
  type?: ItemType;

  /** The role of the message author. Applies to `Message` items. Read-only. */
  @visibility(Lifecycle.Read)
  role?: MessageRole;

  /** The text content of the message. Applies to `Message` items. Read-only. */
  @visibility(Lifecycle.Read)
  content?: string;

  /** Identifier correlating a function call with its output. Applies to `FunctionCall` and `FunctionCallOutput` items. Read-only. */
  @visibility(Lifecycle.Read)
  callId?: string;

  /** The name of the function (tool) invoked. Applies to `FunctionCall` items. Read-only. */
  @visibility(Lifecycle.Read)
  name?: string;

  /** Named arguments passed to the function (tool), keyed by parameter name. Applies to `FunctionCall` items. Read-only. */
  @visibility(Lifecycle.Read)
  arguments?: Record<unknown>;

  /** The output produced by the function (tool) call. Applies to `FunctionCallOutput` items. Read-only. */
  @visibility(Lifecycle.Read)
  output?: string;

  /** Summary of the compacted conversation history. Applies to `Compaction` items. Read-only. */
  @visibility(Lifecycle.Read)
  summary?: string;

  /** The status of the output item. Read-only. */
  @visibility(Lifecycle.Read)
  status?: ResponseStatus;
}

/** Mix-in for the output property. */
model ResponseOutputProperty {
  /** Output items (messages, tool calls, etc.). Read-only. */
  @visibility(Lifecycle.Read)
  output: ResponseItem[];
}

/** Mix-in for the previousResponseId property. */
model PreviousResponseProperty {
  /** ID of a previous response for multi-turn chaining. Writable on create. */
  previousResponseId?: string;
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
@azureBaseType(#{ baseType: BaseType.Agent, version: "2024-06-01" })
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
