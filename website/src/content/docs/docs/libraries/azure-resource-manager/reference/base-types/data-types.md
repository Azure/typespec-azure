---
title: "Data types (base-types)"
description: "Data types exported by @azure-tools/typespec-azure-resource-manager/base-types"
llmstxt: true
---

## Azure.ResourceManager.BaseTypes

### `AgentBaseTypePropertiesAppliance` {#Azure.ResourceManager.BaseTypes.AgentBaseTypePropertiesAppliance}

Appliance deployment model resolution of AgentBaseTypeProperties. In the Appliance model all rp-determined fields resolve to read-only (the appliance owns and reports state; the client does not set these fields).

```typespec
model Azure.ResourceManager.BaseTypes.AgentBaseTypePropertiesAppliance
```

#### Properties

| Name        | Type                                                       | Description                                                                    |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| baseTypes   | `Azure.ResourceManager.BaseTypes.BaseType[]`               | ARM-managed. Must include {"baseType": "agent", "version": "{schemaVersion}"}. |
| displayName | `string`                                                   | Human-friendly name.                                                           |
| description | `string`                                                   | Purpose/behavior summary.                                                      |
| definition  | `Azure.ResourceManager.BaseTypes.AgentDefinitionAppliance` | Inline agent definition. See the AgentDefinitionAppliance sub-schema.          |
| tools?      | `Azure.ResourceManager.BaseTypes.AgentToolAppliance[]`     | Tool bindings. See the AgentToolAppliance sub-schema.                          |

### `AgentBaseTypePropertiesPlatform` {#Azure.ResourceManager.BaseTypes.AgentBaseTypePropertiesPlatform}

Platform deployment model resolution of AgentBaseTypeProperties. In the Platform model all rp-determined fields resolve to writable (the client owns these fields). baseTypes remains ARM-managed and read-only.

```typespec
model Azure.ResourceManager.BaseTypes.AgentBaseTypePropertiesPlatform
```

#### Properties

| Name        | Type                                                      | Description                                                                    |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| baseTypes   | `Azure.ResourceManager.BaseTypes.BaseType[]`              | ARM-managed. Must include {"baseType": "agent", "version": "{schemaVersion}"}. |
| displayName | `string`                                                  | Human-friendly name.                                                           |
| description | `string`                                                  | Purpose/behavior summary.                                                      |
| definition  | `Azure.ResourceManager.BaseTypes.AgentDefinitionPlatform` | Inline agent definition. See the AgentDefinitionPlatform sub-schema.           |
| tools?      | `Azure.ResourceManager.BaseTypes.AgentToolPlatform[]`     | Tool bindings. See the AgentToolPlatform sub-schema.                           |

### `AgentDefinition` {#Azure.ResourceManager.BaseTypes.AgentDefinition}

Inline agent definition describing the model and behavior of the agent. Mutability of the rp-determined fields is resolved by the deployment model.

```typespec
model Azure.ResourceManager.BaseTypes.AgentDefinition
```

#### Properties

| Name                | Type     | Description                                                                                              |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| model               | `string` | Model identifier (RP-defined).                                                                           |
| modelDeploymentRef? | `string` | Optional RP-specific reference to an underlying model deployment.                                        |
| instructions?       | `string` | System prompt / behavioral instructions. Required on request when the RP exposes this field as writable. |

### `AgentDefinitionAppliance` {#Azure.ResourceManager.BaseTypes.AgentDefinitionAppliance}

Appliance deployment model resolution of AgentDefinition. All rp-determined fields resolve to read-only.

```typespec
model Azure.ResourceManager.BaseTypes.AgentDefinitionAppliance
```

#### Properties

| Name                | Type     | Description                                                       |
| ------------------- | -------- | ----------------------------------------------------------------- |
| model?              | `string` | Model identifier (RP-defined).                                    |
| modelDeploymentRef? | `string` | Optional RP-specific reference to an underlying model deployment. |
| instructions?       | `string` | System prompt / behavioral instructions.                          |

### `AgentDefinitionPlatform` {#Azure.ResourceManager.BaseTypes.AgentDefinitionPlatform}

Platform deployment model resolution of AgentDefinition. All rp-determined fields resolve to writable.

```typespec
model Azure.ResourceManager.BaseTypes.AgentDefinitionPlatform
```

#### Properties

| Name                | Type     | Description                                                       |
| ------------------- | -------- | ----------------------------------------------------------------- |
| model               | `string` | Model identifier (RP-defined).                                    |
| modelDeploymentRef? | `string` | Optional RP-specific reference to an underlying model deployment. |
| instructions        | `string` | System prompt / behavioral instructions.                          |

### `AgentTool` {#Azure.ResourceManager.BaseTypes.AgentTool}

A tool binding for an agent, aligned with Azure AI Foundry-style tool bindings. Mutability of the rp-determined fields is resolved by the deployment model.

```typespec
model Azure.ResourceManager.BaseTypes.AgentTool
```

#### Properties

| Name | Type     | Description                                                                                  |
| ---- | -------- | -------------------------------------------------------------------------------------------- |
| type | `string` | Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. |
| name | `string` | Tool name/identifier.                                                                        |

### `AgentToolAppliance` {#Azure.ResourceManager.BaseTypes.AgentToolAppliance}

Appliance deployment model resolution of AgentTool. All fields resolve to read-only.

```typespec
model Azure.ResourceManager.BaseTypes.AgentToolAppliance
```

#### Properties

| Name  | Type     | Description                                                                                  |
| ----- | -------- | -------------------------------------------------------------------------------------------- |
| type? | `string` | Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. |
| name? | `string` | Tool name/identifier.                                                                        |

### `AgentToolPlatform` {#Azure.ResourceManager.BaseTypes.AgentToolPlatform}

Platform deployment model resolution of AgentTool. All fields resolve to writable.

```typespec
model Azure.ResourceManager.BaseTypes.AgentToolPlatform
```

#### Properties

| Name | Type     | Description                                                                                  |
| ---- | -------- | -------------------------------------------------------------------------------------------- |
| type | `string` | Tool type discriminator. Must be one of the publicly documented Azure AI Foundry tool types. |
| name | `string` | Tool name/identifier.                                                                        |

### `BaseType` {#Azure.ResourceManager.BaseTypes.BaseType}

An ARM-managed base type descriptor identifying the schema contract a resource conforms to.

```typespec
model Azure.ResourceManager.BaseTypes.BaseType
```

#### Properties

| Name     | Type     | Description                                      |
| -------- | -------- | ------------------------------------------------ |
| baseType | `string` | The base type identifier (for example, "agent"). |
| version  | `string` | The schema version of the base type.             |

### `Conversation` {#Azure.ResourceManager.BaseTypes.Conversation}

A conversation resource holding the items and metadata exchanged between a client and an agent.

```typespec
model Azure.ResourceManager.BaseTypes.Conversation
```

#### Properties

| Name            | Type                                                 | Description                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| conversationId? | `string`                                             | Unique conversation identifier. Read-only (set by the service on creation).                                                                                                                                          |
| createdAt?      | `int64`                                              | Unix timestamp of when the conversation was created. Read-only.                                                                                                                                                      |
| metadata?       | `Record<string>`                                     | Up to 16 key-value pairs (keys max 64 chars, values max 512 chars). Writable on create and update.                                                                                                                   |
| items?          | `Azure.ResourceManager.BaseTypes.ConversationItem[]` | Conversation items (messages, tool calls, tool outputs). Each item has type, role, and content. Up to 20 items may be provided at creation. Writable on create; additional items are appended by response execution. |

### `ConversationItem` {#Azure.ResourceManager.BaseTypes.ConversationItem}

A conversation item such as a message, tool call, or tool output.

```typespec
model Azure.ResourceManager.BaseTypes.ConversationItem
```

#### Properties

| Name     | Type     | Description                                                                |
| -------- | -------- | -------------------------------------------------------------------------- |
| type?    | `string` | The item type (for example, message, tool call, or tool output).           |
| role?    | `string` | The role associated with the item (for example, user, assistant, or tool). |
| content? | `string` | The content of the conversation item.                                      |

### `InputMessage` {#Azure.ResourceManager.BaseTypes.InputMessage}

A single input message provided to the model.

```typespec
model Azure.ResourceManager.BaseTypes.InputMessage
```

#### Properties

| Name     | Type     | Description                                                               |
| -------- | -------- | ------------------------------------------------------------------------- |
| role?    | `string` | The role of the message author (for example, user, system, or developer). |
| content? | `string` | The content of the input message.                                         |

### `Response` {#Azure.ResourceManager.BaseTypes.Response}

A response generated by an agent for a given input, including its output, status, and usage.

```typespec
model Azure.ResourceManager.BaseTypes.Response
```

#### Properties

| Name                  | Type                                                                                  | Description                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| responseId?           | `string`                                                                              | Unique response identifier. Read-only (set by the service).                                                                                           |
| createdAt?            | `int64`                                                                               | Unix timestamp of when the response was created. Read-only.                                                                                           |
| model?                | `string`                                                                              | Model ID used to generate the response (e.g., gpt-4o-mini). May be specified on request to override the agent default; read-only in GET.              |
| status?               | `"completed" \| "failed" \| "cancelled" \| "incomplete" \| "queued" \| "in_progress"` | The status of the response. Read-only.                                                                                                                |
| input                 | `Azure.ResourceManager.BaseTypes.InputMessage[]`                                      | Content input to the model. Required on create. May be provided as a single string or as an array of input messages; see the InputMessage sub-schema. |
| output?               | `Azure.ResourceManager.BaseTypes.ResponseOutputItem[]`                                | Output items (messages, tool calls, etc.). Each item has id, type, role, status, content. Read-only.                                                  |
| previous_response_id? | `string`                                                                              | ID of a previous response for multi-turn chaining (alternative to conversation). Writable on create.                                                  |
| conversation?         | `{...}`                                                                               | Conversation association: { id }. Writable on create to link response to a conversation.                                                              |
| conversation.id?      | `string`                                                                              |                                                                                                                                                       |
| instructions?         | `string`                                                                              | System/developer message for this response. Writable on create; overrides agent-level instructions for this invocation.                               |
| tools?                | `Azure.ResourceManager.BaseTypes.AgentTool[]`                                         | Tools available during this response. Writable on create; overrides agent-level tools for this invocation.                                            |
| tool_choice?          | `unknown`                                                                             | How the model should select tools. May be a string (e.g., auto, none) or an object. Writable on create.                                               |
| metadata?             | `Record<string>`                                                                      | Up to 16 key-value pairs. Writable on create and update.                                                                                              |
| usage?                | `Azure.ResourceManager.BaseTypes.ResponseUsage`                                       | Token usage: { input_tokens, output_tokens, total_tokens }. Read-only.                                                                                |
| error?                | `Azure.ResourceManager.BaseTypes.ResponseError`                                       | Error details if the response failed: { code, message }.                                                                                              |
| incomplete_details?   | `Azure.ResourceManager.BaseTypes.ResponseIncompleteDetails`                           | Details if the response is incomplete: { reason } (e.g., max_output_tokens).                                                                          |

### `ResponseError` {#Azure.ResourceManager.BaseTypes.ResponseError}

Error details for a failed response.

```typespec
model Azure.ResourceManager.BaseTypes.ResponseError
```

#### Properties

| Name     | Type     | Description                     |
| -------- | -------- | ------------------------------- |
| code?    | `string` | A machine-readable error code.  |
| message? | `string` | A human-readable error message. |

### `ResponseIncompleteDetails` {#Azure.ResourceManager.BaseTypes.ResponseIncompleteDetails}

Details explaining why a response is incomplete.

```typespec
model Azure.ResourceManager.BaseTypes.ResponseIncompleteDetails
```

#### Properties

| Name    | Type     | Description                                                             |
| ------- | -------- | ----------------------------------------------------------------------- |
| reason? | `string` | The reason the response is incomplete (for example, max_output_tokens). |

### `ResponseOutputItem` {#Azure.ResourceManager.BaseTypes.ResponseOutputItem}

An item produced in the response output, such as a message or tool call.

```typespec
model Azure.ResourceManager.BaseTypes.ResponseOutputItem
```

#### Properties

| Name     | Type     | Description                                               |
| -------- | -------- | --------------------------------------------------------- |
| id?      | `string` | Unique identifier of the output item.                     |
| type?    | `string` | The output item type (for example, message or tool call). |
| role?    | `string` | The role associated with the output item.                 |
| status?  | `string` | The status of the output item.                            |
| content? | `string` | The content of the output item.                           |

### `ResponseUsage` {#Azure.ResourceManager.BaseTypes.ResponseUsage}

Token usage information for a response.

```typespec
model Azure.ResourceManager.BaseTypes.ResponseUsage
```

#### Properties

| Name           | Type    | Description                                 |
| -------------- | ------- | ------------------------------------------- |
| input_tokens?  | `int32` | Number of input tokens consumed.            |
| output_tokens? | `int32` | Number of output tokens generated.          |
| total_tokens?  | `int32` | Total number of tokens (input plus output). |

### `Versions` {#Azure.ResourceManager.BaseTypes.Versions}

The versions of the experimental Azure Resource Manager agent base types.

```typespec
enum Azure.ResourceManager.BaseTypes.Versions
```

| Name           | Value             | Description                                                                        |
| -------------- | ----------------- | ---------------------------------------------------------------------------------- |
| v1_0_Preview_1 | `"1.0-preview.1"` | Experimental version 1.0-preview.1 of the Azure Resource Manager agent base types. |
