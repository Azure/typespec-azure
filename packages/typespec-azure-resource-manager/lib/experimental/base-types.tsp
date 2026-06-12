import "@typespec/openapi";
import "@typespec/versioning";

using OpenAPI;
using Versioning;

/**
 * Experimental Azure Resource Manager agent base types.
 *
 * These types describe the ARM `agent` base type schema and its runtime surface
 * (conversations and responses). This namespace is experimental and may change in a
 * breaking way between versions.
 */
@versioned(Versions)
namespace Azure.ResourceManager.BaseTypes;

/**
 * The versions of the experimental Azure Resource Manager agent base types.
 */
enum Versions {
  /** Experimental version 1.0-preview.1 of the Azure Resource Manager agent base types. */
  v1_0_Preview_1: "1.0-preview.1",
}

/**
 * An ARM-managed base type descriptor identifying the schema contract a resource conforms to.
 */
@added(Versions.v1_0_Preview_1)
model BaseType {
  /** The base type identifier (for example, "agent"). */
  baseType: string;

  /** The schema version of the base type. */
  version: string;
}

/**
 * Inline agent definition describing the model and behavior of the agent. Mutability of the rp-determined fields is resolved by the deployment model.
 */
@added(Versions.v1_0_Preview_1)
model AgentDefinition {
  /** Model identifier (RP-defined). */
  `model`: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. Required on request when the RP exposes this field as writable. */
  instructions?: string;
}

/**
 * Appliance deployment model resolution of AgentDefinition. All rp-determined fields resolve to read-only.
 */
@added(Versions.v1_0_Preview_1)
model AgentDefinitionAppliance {
  /** Model identifier (RP-defined). */
  @visibility(Lifecycle.Read)
  `model`?: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  @visibility(Lifecycle.Read)
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. */
  @visibility(Lifecycle.Read)
  instructions?: string;
}

/**
 * Platform deployment model resolution of AgentDefinition. All rp-determined fields resolve to writable.
 */
@added(Versions.v1_0_Preview_1)
model AgentDefinitionPlatform {
  /** Model identifier (RP-defined). */
  `model`: string;

  /** Optional RP-specific reference to an underlying model deployment. */
  modelDeploymentRef?: string;

  /** System prompt / behavioral instructions. */
  instructions: string;
}

/**
 * A tool binding for an agent, aligned with Azure AI Foundry-style tool bindings. Mutability of the rp-determined fields is resolved by the deployment model.
 */
@added(Versions.v1_0_Preview_1)
model AgentTool {
  /** Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. */
  type: string;

  /** Tool name/identifier. */
  name: string;
}

/**
 * Appliance deployment model resolution of AgentTool. All fields resolve to read-only.
 */
@added(Versions.v1_0_Preview_1)
model AgentToolAppliance {
  /** Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. */
  @visibility(Lifecycle.Read)
  type?: string;

  /** Tool name/identifier. */
  @visibility(Lifecycle.Read)
  name?: string;
}

/**
 * Platform deployment model resolution of AgentTool. All fields resolve to writable.
 */
@added(Versions.v1_0_Preview_1)
model AgentToolPlatform {
  /** Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. */
  type: string;

  /** Tool name/identifier. */
  name: string;
}

/**
 * Appliance deployment model resolution of AgentBaseTypeProperties. In the Appliance model all rp-determined fields resolve to read-only (the appliance owns and reports state; the client does not set these fields).
 */
@added(Versions.v1_0_Preview_1)
model AgentBaseTypePropertiesAppliance {
  /** ARM-managed. Must include {"baseType": "agent", "version": "{schemaVersion}"}. */
  @visibility(Lifecycle.Read)
  @extension("x-ms-identifiers", #["baseType"])
  baseTypes: BaseType[];

  /** Human-friendly name. */
  @visibility(Lifecycle.Read)
  displayName: string;

  /** Purpose/behavior summary. */
  @visibility(Lifecycle.Read)
  description: string;

  /** Inline agent definition. See the AgentDefinitionAppliance sub-schema. */
  @visibility(Lifecycle.Read)
  definition: AgentDefinitionAppliance;

  /** Tool bindings. See the AgentToolAppliance sub-schema. */
  @visibility(Lifecycle.Read)
  @extension("x-ms-identifiers", #["name"])
  tools?: AgentToolAppliance[];
}

/**
 * Platform deployment model resolution of AgentBaseTypeProperties. In the Platform model all rp-determined fields resolve to writable (the client owns these fields). baseTypes remains ARM-managed and read-only.
 */
@added(Versions.v1_0_Preview_1)
model AgentBaseTypePropertiesPlatform {
  /** ARM-managed. Must include {"baseType": "agent", "version": "{schemaVersion}"}. */
  @visibility(Lifecycle.Read)
  @extension("x-ms-identifiers", #["baseType"])
  baseTypes: BaseType[];

  /** Human-friendly name. */
  displayName: string;

  /** Purpose/behavior summary. */
  description: string;

  /** Inline agent definition. See the AgentDefinitionPlatform sub-schema. */
  definition: AgentDefinitionPlatform;

  /** Tool bindings. See the AgentToolPlatform sub-schema. */
  @extension("x-ms-identifiers", #["name"])
  tools?: AgentToolPlatform[];
}

/**
 * A conversation resource holding the items and metadata exchanged between a client and an agent.
 */
@added(Versions.v1_0_Preview_1)
model Conversation {
  /** Unique conversation identifier. Read-only (set by the service on creation). */
  @visibility(Lifecycle.Read)
  conversationId?: string;

  /** Unix timestamp of when the conversation was created. Read-only. */
  @visibility(Lifecycle.Read)
  createdAt?: int64;

  /** Up to 16 key-value pairs (keys max 64 chars, values max 512 chars). Writable on create and update. */
  @extension("maxProperties", 16)
  @extension("additionalProperties", #{ type: "string", maxLength: 512 })
  metadata?: Record<string>;

  /** Conversation items (messages, tool calls, tool outputs). Each item has type, role, and content. Up to 20 items may be provided at creation. Writable on create; additional items are appended by response execution. */
  @maxItems(20)
  @extension("x-ms-identifiers", #[])
  items?: ConversationItem[];
}

/**
 * A conversation item such as a message, tool call, or tool output.
 */
@added(Versions.v1_0_Preview_1)
model ConversationItem {
  /** The item type (for example, message, tool call, or tool output). */
  type?: string;

  /** The role associated with the item (for example, user, assistant, or tool). */
  role?: string;

  /** The content of the conversation item. */
  content?: string;
}

/**
 * A reference to the conversation to associate with a response.
 */
@added(Versions.v1_0_Preview_1)
model ConversationReference {
  /** The identifier of the conversation to associate with this response. */
  id?: string;
}

/**
 * The status of a response.
 */
@added(Versions.v1_0_Preview_1)
union ResponseStatus {
  /** The response completed successfully. */
  Completed: "completed",

  /** The response failed. */
  Failed: "failed",

  /** The response was cancelled. */
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
 * A response generated by an agent for a given input, including its output, status, and usage.
 */
@added(Versions.v1_0_Preview_1)
model Response {
  /** Unique response identifier. Read-only (set by the service). */
  @visibility(Lifecycle.Read)
  responseId?: string;

  /** Unix timestamp of when the response was created. Read-only. */
  @visibility(Lifecycle.Read)
  createdAt?: int64;

  /** Model ID used to generate the response (e.g., gpt-4o-mini). May be specified on request to override the agent default; read-only in GET. */
  `model`?: string;

  /** The status of the response. Read-only. */
  @visibility(Lifecycle.Read)
  status?: ResponseStatus;

  /** Content input to the model. Required on create. May be provided as a single string or as an array of input messages; see the InputMessage sub-schema. */
  @extension("x-ms-identifiers", #[])
  input: InputMessage[];

  /** Output items (messages, tool calls, etc.). Each item has id, type, role, status, content. Read-only. */
  @visibility(Lifecycle.Read)
  output?: ResponseOutputItem[];

  /** ID of a previous response for multi-turn chaining (alternative to conversation). Writable on create. */
  previous_response_id?: string;

  /** Conversation association: { id }. Writable on create to link response to a conversation. */
  conversation?: ConversationReference;

  /** System/developer message for this response. Writable on create; overrides agent-level instructions for this invocation. */
  instructions?: string;

  /** Tools available during this response. Writable on create; overrides agent-level tools for this invocation. */
  @extension("x-ms-identifiers", #["name"])
  tools?: AgentTool[];

  /** How the model should select tools. May be a string (e.g., auto, none) or an object. Writable on create. */
  tool_choice?: unknown;

  /** Up to 16 key-value pairs. Writable on create and update. */
  @extension("maxProperties", 16)
  metadata?: Record<string>;

  /** Token usage: { input_tokens, output_tokens, total_tokens }. Read-only. */
  @visibility(Lifecycle.Read)
  usage?: ResponseUsage;

  /** Error details if the response failed: { code, message }. */
  @visibility(Lifecycle.Read)
  error?: ResponseError;

  /** Details if the response is incomplete: { reason } (e.g., max_output_tokens). */
  @visibility(Lifecycle.Read)
  incomplete_details?: ResponseIncompleteDetails;
}

/**
 * A single input message provided to the model.
 */
@added(Versions.v1_0_Preview_1)
model InputMessage {
  /** The role of the message author (for example, user, system, or developer). */
  role?: string;

  /** The content of the input message. */
  content?: string;
}

/**
 * An item produced in the response output, such as a message or tool call.
 */
@added(Versions.v1_0_Preview_1)
model ResponseOutputItem {
  /** Unique identifier of the output item. */
  id?: string;

  /** The output item type (for example, message or tool call). */
  type?: string;

  /** The role associated with the output item. */
  role?: string;

  /** The status of the output item. */
  status?: ResponseStatus;

  /** The content of the output item. */
  content?: string;
}

/**
 * Token usage information for a response.
 */
@added(Versions.v1_0_Preview_1)
model ResponseUsage {
  /** Number of input tokens consumed. */
  input_tokens?: int32;

  /** Number of output tokens generated. */
  output_tokens?: int32;

  /** Total number of tokens (input plus output). */
  total_tokens?: int32;
}

/**
 * Error details for a failed response.
 */
@added(Versions.v1_0_Preview_1)
model ResponseError {
  /** A machine-readable error code. */
  code?: string;

  /** A human-readable error message. */
  message?: string;
}

/**
 * Details explaining why a response is incomplete.
 */
@added(Versions.v1_0_Preview_1)
model ResponseIncompleteDetails {
  /** The reason the response is incomplete (for example, max_output_tokens). */
  reason?: string;
}
