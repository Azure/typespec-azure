# Azure Resource Manager: Base Types System

## Executive Summary

Azure Resource Manager (ARM) is introducing a **base types system** that enables resource inheritance, allowing different resource providers to implement specialized resources that share common schemas, behaviors, and management experiences. The first implementation is the **"agent"** base type, which standardizes AI agent resources across Microsoft teams while preserving team autonomy. You'll see it used as an example throughout this document.

## The Base Type Concept

### What is a Base Type?

A **base type** is a standardized schema contract that resources can inherit to gain:
- **Common properties** and behaviors
- **Unified management experiences** (Portal, CLI, PowerShell)
- **Cross-resource operations** (policies, queries, governance)
- **Specialized experiences** tailored to each resource type
- **Required child resource patterns** (e.g., conversations, responses for agents)

A base type defines the **schema** (property names, types, and *payload-level* required vs. optional) for each field, but does **not** dictate whether a field is read-only or writable. That decision is left to each RP based on their deployment model. See [Field Mutability](#field-mutability).

Separately, the base type system also defines **conformance requirements** for RPs (which base properties and child resource types an RP MUST implement vs MAY omit). This is expressed via `x-arm-baseTypeRequirement` (see [Base Type Conformance Requirements (Meta)](#base-type-conformance-requirements-meta)).


### How It Works
Resource provider developers will define their own resource types within their namespace that adhere to base type properties and operations as well as provide their own unique properties and operations that support their service.

> **Note:** The resource types shown below are **illustrative examples only** — they do not exist today. They are used to demonstrate how multiple RPs could independently adopt the same base type.

```
┌─────────────────────────────────────────────────────────────┐
│                     Base Type: agent                        │
│                                                             │
│  Schema:                                                    │
│    • displayName: string (required)                         │
│    • description: string (required)                         │
│    • definition: object (required)                          │
│    • tools: object[] (required)                             │
│    • identity: required                                     │
│    • requiredBuiltInRoleReadOnly: string                    │
│    • requiredBuiltInRoleWrite: string                       │
│                                                             │
│  Required Child Resources:                                  │
│    • conversations, responses                               │
└──────┬──────────┬───────────────┬───────────────┬───────────┘
       │          │               │               │
       ▼          ▼               ▼               ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────────────┐
│Microsoft.│ │Microsoft.│ │Microsoft.    │ │Microsoft.       │
│Copilot/  │ │Workflow/ │ │Teams/        │ │PowerPlatform/   │
│assistants│ │orchstr.  │ │TeamsAgents   │ │copilots         │
│          │ │          │ │              │ │                 │
│Inherits  │ │Inherits  │ │Inherits      │ │Inherits         │
│agent     │ │agent     │ │agent         │ │agent            │
│schema    │ │schema    │ │schema        │ │schema           │
│          │ │          │ │              │ │                 │
│+ ide     │ │+ approval│ │+ chatChannels│ │+ connector      │
│  Integr. │ │  Wkflows │ │+ conv.State  │ │  Mappings       │
│+ lang    │ │+ trigger │ │+ team        │ │+ flow           │
│  Support │ │  Events  │ │  Integration │ │  Integration    │
│+ repo    │ │+ step    │ │+ message     │ │+ dataverse      │
│  Access  │ │  Defs    │ │  Handlers    │ │  Access         │
└──────────┘ └──────────┘ └──────────────┘ └─────────────────┘
```

### Unified Operations
```bash
# Works across ALL agent types
az resource list --query "[?baseTypes[0].baseType=='agent']"
az policy assignment create --policy "require-agent-managed-identity" --scope "/subscriptions/xxx"

# Specific to resource type
az copilot assistant create --name "my-coding-assistant"
az workflow orchestrator create --name "my-approval-workflow"
az teams bot create --name "my-support-bot"
```

### Portal Experience

Because all agent resources share the `baseTypes` declaration, the Azure Portal can provide **unified experiences** across RPs:

- **"All Agents" view**: A single portal blade that lists every resource that follows the base type "agent" schema across all RPs in a subscription. Administrators see a unified inventory regardless of which RP created the agent.
- **RP-specific blades**: Each RP still owns its own portal experience for creating, configuring, and managing its agent type. The base type doesn't replace RP-specific UX — it adds a cross-cutting layer on top.
- **Governance integration**: Azure Policy and Resource Graph leverage `baseTypes` to target all agents uniformly — for example, a single policy can enforce that every agent resource (across all RPs) has a valid `agentIdentity`.
- **Consistent property display**: Because base type properties (`displayName`, `description`, `definition.model`, `tools`) are in a known schema, the portal can render common fields consistently across agent types without per-RP customization.

### Azure Resource Graph Indexing

Base type properties are indexed in **Azure Resource Graph (ARG)**, enabling cross-RP governance queries. Because all agent resources share the same base schema, ARG can expose a dedicated **`agents`** table that aggregates every resource conforming to the agent base type — regardless of which RP created it. Administrators query the `agents` table directly instead of filtering the generic `resources` table:

```kusto
agents
| project name, type, location, model=properties.definition.model, toolCount=array_length(properties.tools)
```

This enables scenarios like:
- **Audit**: `agents | summarize count() by model=tostring(properties.definition.model)` — "What models are my agents using?"
- **Policy enforcement**: "Ensure no agent uses an unapproved model."
- **Inventory**: `agents | where array_length(properties.tools) > 0 | count` — "How many agents have tools enabled across all RPs?"

For this to work, RPs must ensure base type properties appear in the standard `properties` bag (not nested in RP-specific sub-objects).

## Resource Schema Structure

### Base Type Declaration
Below is a sample ARM resource schema that highlights how a team defines their own type, in this case Copilot assistants, and how it conforms to the **agent** base type schema and add its own resource specific properties.
```json
{
  "type": "Microsoft.Copilot/assistants",
  "baseTypes": [
    {
      "baseType": "agent",
      "version": "2026-04-01"
    }
  ],                                    // ARM-injected, read-only
  "location": "westus2",
  "identity": { /* identity envelope with agentIdentity */ },
  "properties": {
    // Required base properties
    "displayName": "Coding Assistant",
    "description": "Help users with coding tasks across their repositories",
    "definition": {
      "model": "gpt-4o-mini",
      "instructions": "You are a coding assistant. Help users analyze code, find bugs, and suggest improvements."
    },
    "tools": [
      {
        "type": "Function",
        "name": "analyze_code",
        // RP-specific properties under tools (not part of the base type)
        "tags": ["code", "analysis"],
        "inputSchema": {
          "type": "object",
          "properties": {
            "filePath": { "type": "string", "description": "Path to the file to analyze." },
            "language": { "type": "string", "description": "Programming language of the file." }
          },
          "required": ["filePath"]
        }
      }
    ],
    "requiredBuiltInRoleReadOnly": "Reader",
    "requiredBuiltInRoleWrite": "Contributor",
    
    // Resource-specific properties (not part of the base type)
    "ideIntegration": "vscode",
    "languageSupport": ["typescript", "python"],
    "repositoryAccess": {
      "scope": "organization",
      "permissions": ["read", "analyze"]
    }
  }
}
```

## Field Mutability

### The Problem

A base type defines the **schema** — the property name, type, and whether it's required or optional. But different RPs have fundamentally different deployment patterns for the same base type. Some RPs provide pre-built agents as a service (**Appliance model** — most properties are read-only, baked in by the RP). Others provide a platform for customers to author agents (**Platform model** — most properties are writable by the deployer).

The base type system must be **opinionated about schema** but **flexible about mutability**.

### Mutability Classifications

Each field in a base type schema has a **mutability classification** that tells RPs how to treat it:

| Classification | Meaning | OpenAPI annotation | Example fields |
|---|---|---|---|
| `always-readonly` | Always read-only, ARM-managed or RP-populated. Cannot be set by any deployer. | `readOnly: true` (required) | `baseTypes` |
| `rp-determined` | The base type defines the schema/type, but the **RP decides** whether it's read-only or writable. The RP annotates `readOnly: true` in its swagger if it's not deployer-configurable. | `readOnly: true` (RP's choice) | `displayName`, `description`, `definition`, `tools`, `requiredBuiltInRoleReadOnly`, `requiredBuiltInRoleWrite` |
| `always-writable` | Always writable by the deployer. The RP must accept deployer input. | (no readOnly annotation) | `identity`, `tags` |

This means the base type system enforces **consistent schema** (every agent has a `model` field of type `string`) while allowing RPs to decide **who populates it** (the RP for an Appliance, the deployer for a Platform).

### How RPs Declare Mutability

RPs declare field mutability in their **OpenAPI spec** by annotating properties with `readOnly: true` where appropriate. The base type validation pipeline (swagger linter) verifies:

1. Fields classified `always-readonly` are marked `readOnly: true`.
2. Fields classified `always-writable` are **not** marked `readOnly: true`.
3. Fields classified `rp-determined` have a `readOnly` annotation that is consistent with the RP's documented deployment model.

The base type author (ARM) defines whether a field is `always-readonly`, `always-writable`, or `rp-determined` by annotating the **ARM-owned base type swagger** with a vendor extension. We use **Option A**: an `x-arm-mutability` field on each base type property (see [Swagger Annotations](#swagger-annotations)).

> Important: OpenAPI `required` indicates whether a property must exist in a *resource payload*. Base type conformance (whether the RP must expose a property at all) is expressed separately via `x-arm-baseTypeRequirement`.

### Example: Agent Base Type Mutability

| Property | Schema (enforced by base type) | Mutability classification |
|---|---|---|
| `baseTypes` | `object[]` (with `baseType` + `version`) | `always-readonly` |
| `displayName` | `string`, required | `rp-determined` |
| `description` | `string`, required | `rp-determined` |
| `definition` | `object`, required | `rp-determined` |
| `tools` | `object[]`, required | `rp-determined` |
| `requiredBuiltInRoleReadOnly` | `string`, required | `rp-determined` |
| `requiredBuiltInRoleWrite` | `string`, required | `rp-determined` |
| `identity` | managed identity object | `always-writable` |
| `tags` | `object` | `always-writable` |

### Optional Base Properties (Conformant-If-Used)

Not every property defined by a base type must be implemented by every RP that adopts the base type.

- **Required base properties** MUST be implemented.
- **Optional base properties** MAY be omitted entirely.
  - However, **If an RP includes an optional base property**, it MUST adhere to the base type’s schema definition for that property (same name, type, shape, and location).

In the ARM-owned base type swagger, “required vs optional for RP conformance” is expressed via `x-arm-baseTypeRequirement: required|optional`.

#### Agent base type conformance requirements

| Property | `x-arm-baseTypeRequirement` | Notes |
|---|---|---|
| `baseTypes` | `required` | ARM-managed; every agent resource must have this. |
| `displayName` | `required` | Human-friendly name. |
| `description` | `required` | Purpose/behavior summary. |
| `definition` | `required` | Inline agent definition (model + instructions). |
| `definition.model` | `required` | Model identifier. |
| `definition.instructions` | `required` | System prompt. |
| `definition.modelDeploymentRef` | `optional` | RP-specific model deployment reference. RP may omit entirely. |
| `tools` | `required` | Tool bindings array. |
| `requiredBuiltInRoleReadOnly` | `required` | Minimum role for read-only mode. |
| `requiredBuiltInRoleWrite` | `required` | Minimum role for write mode. |
| `identity` | `required` | Identity envelope with `agentIdentity`. |
| `identity.agentIdentity` | `required` | Entra Agent ID association. |
| `identity.userAssignedIdentities` | `optional` | Standard ARM managed identity. RP may omit. |
| `tags` | `optional` | ARM tags. |
| **Child resources** | | |
| Conversations | `required` | Read-only proxy for conversation metadata. |
| Responses | `required` | Read-only proxy for response metadata. |

### Base Type Conformance Requirements (Meta definition)

The base type system needs to express two *separate* concepts that can otherwise be conflated:

1. **Base type conformance requirements (RP implementation surface)**
  - Whether an RP must implement/expose a given base property or child resource type in order to claim conformance to the base type.
  - Example: An RP adopting the agent base type MUST implement managed identity and role requirement properties; it MAY choose to implement MCP-related properties.

2. **Resource instance schema requirements (per-resource payload shape)**
  - Whether a property must be present on an individual resource instance payload.
  - This is expressed via standard OpenAPI/JSON Schema constructs like `required: [...]`, types, formats, etc.
- Example: A PUT request MUST include the location property, but optionally a SKU property.

While #2 is a fundamental resource type schema concept, #1 is new to base type definitions, and allows the base type model to be flexible to multiple scenarios, but opinionated on how it is represented.

To represent **(1)**, base type definitions use a vendor extension on each base property and each required child resource type:

`x-arm-baseTypeRequirement: required | optional`

Semantics:
- `required`: An RP claiming base type conformance MUST include this property/child resource type in its swagger surface.
- `optional`: An RP MAY omit this property/child resource type entirely.
- If an RP includes an `optional` property/child type, it MUST conform to the base type’s schema for it.

> Note: `x-arm-baseTypeRequirement` is distinct from `x-arm-mutability`. Mutability answers “who can set it”; baseTypeRequirement answers “must the RP implement it at all”.

## Required Child Resource Types

A base type can require that inheriting resource types implement **child resource types** with their own schemas. This goes beyond just defining properties on the parent resource — it mandates an entire resource hierarchy.

For the **agent** base type, these required child resources are:

| Child resource | Resource ID pattern | Purpose |
|---|---|---|
| **Conversations** | `.../agents/{agentName}/conversations/{conversationId}` | Read-only proxy for durable conversational container metadata (no message content) |
| **Responses** | `.../conversations/{conversationId}/responses/{responseId}` | Read-only proxy for execution/output metadata (no response content) |

In the base type swagger, required vs optional child resource types are expressed via `x-arm-baseTypeRequirement` on the child resource type definition(s). The linter validates that RPs include all child types marked `required`.

Each child resource type has its own minimum schema defined by the base type. RPs must implement CRUD APIs for all required child resources. See the [Agent Base Type Specification](agentBaseType-2.md) for full schemas.

The base type validation pipeline will verify that RPs declaring `baseTypes: [{baseType: "agent", ...}]` also define these child resource types in their swagger and manifest.

## Benefits by Stakeholder

| **Stakeholder** | **Benefits** |
|----------------|-------------|
| **Resource Provider Teams** | • Inherit standard schema and behaviors<br>• Focus on differentiation, not repeating behavior<br>• Automatic compliance with ARM patterns<br>• No central team bottleneck to review manually|
| **Customers** | • Consistent management experience across agent types<br>• Unified RBAC, policies, and governance<br>• Cross-agent operations and queries<br>• Single learning curve for all agents |
| **Platform (ARM)** | • Standardized resource patterns<br>• Reduced support burden<br>• Enhanced governance capabilities<br>• Cross-cutting feature development |

## Base Type Lifecycle

### Phase 1: Definition & Validation
- ARM team defines base type schema
- Validation rules implemented in pipelines
- Documentation and samples published

### Phase 2: RP Adoption
- Resource Providers implement inheritance
- Swagger/manifest validation enforced
- Gradual rollout across teams

### Phase 3: Experience Enhancement  
- Portal experiences updated
- Cross-cutting features developed
- Customer feedback incorporated

### Phase 4: Evolution

**Base type schema versioning**
- RPs adhere to newest schema next API release or by communicated due date

**New base types introduced**
- RPs can onboard new types easily to the base type.
- Existing types can be molded to a base type, but some changes may be required.

## Governance Model

### Base Type Management

**Base types are exclusively managed and defined by the ARM Platform Team** to ensure consistency, quality, and compatibility across the Azure ecosystem. This centralized approach prevents fragmentation while maintaining high standards for cross-cutting Azure experiences.

| **Responsibility** | **Owner** |
|-------------------|----------|
| Base Type Definition | ARM Team |
| Schema Design & Validation | ARM Core (Manifest) & ARM Extensibility (Swagger) |
| Schema for new Type using a Base Type | RP Development Team |
| Breaking Changes | API Review Board |
| Documentation | ARM Team + Community |

#### Partner Collaboration Process

While base types are managed by ARM, **partners and resource provider teams can collaborate with the ARM team** to define new base type definitions when there's a clear need for standardization across multiple resource providers.

**Collaboration Steps:**
1. **Proposal Submission** - Partners identify cross-cutting scenarios requiring standardization
2. **Requirements Gathering** - ARM team works with stakeholders to define schema requirements
3. **Design Review** - Joint design sessions to ensure the base type meets all partner needs
4. **Implementation** - ARM team implements and validates the new base type
5. **Partner Adoption** - Coordinated rollout across participating resource providers

**Criteria for New Base Types:**
- **Multi-RP Need** - At least 3+ resource providers (NOT TYPES!) would benefit
- **Common Schema** - Shared properties and behaviors across implementations  
- **Customer Value** - Clear unified experience benefits for customers
- **Platform Alignment** - Fits with overall Azure architecture and governance

## Technical Implementation Details

### ARM Manifest Changes
```json
{
  "resourceTypes": [{
    "resourceType": "agents",
    "baseTypes": [
      {
        "baseType": "agent",
        "version": "2026-04-01"
      }
    ],                                   // Declares inheritance
    "apiVersions": ["2024-01-01"],
    "locations": ["global", "westus2"],
    ...
    }
  }]
}
```

### Swagger Annotations
Below is an example for agent using the new x-arm-mutability & x-arm-baseTypeRequirement settings.

```yaml
# Required in OpenAPI spec
baseTypes:
  type: array
  items:
    type: object
    properties:
      baseType:
        type: string
        description: "Name of the base type (e.g., 'agent')"
      version:
        type: string
        format: date
        description: "API version of the base type schema (e.g., '2026-04-01')"
    required: ["baseType", "version"]
  readOnly: true                         # ARM-managed field (always-readonly)
  description: "Base types this resource inherits from"
  x-arm-mutability: always-readonly
  x-arm-baseTypeRequirement: required
  
properties:
  displayName:                           # Required by agent base type
    type: string
    # readOnly: true                     # Add if Appliance model (rp-determined)
    x-arm-mutability: rp-determined
    x-arm-baseTypeRequirement: required
  description:                           # Required by agent base type
    type: string
    # readOnly: true                     # Add if Appliance model (rp-determined)
    x-arm-mutability: rp-determined
    x-arm-baseTypeRequirement: required
  definition:                            # Required by agent base type
    $ref: '#/definitions/AgentDefinition'
    # readOnly: true                     # Add if Appliance model (rp-determined)
    x-arm-mutability: rp-determined
    x-arm-baseTypeRequirement: required
  tools:                                 # Required by agent base type
    type: array
    items:
      $ref: '#/definitions/ToolBinding'
    # readOnly: true                     # Add if Appliance model (rp-determined)
    x-arm-mutability: rp-determined
    x-arm-baseTypeRequirement: required
  requiredBuiltInRoleReadOnly:           # Required by agent base type
    type: string
    # readOnly: true                     # Add if Appliance model (rp-determined)
    x-arm-mutability: rp-determined
    x-arm-baseTypeRequirement: required
  requiredBuiltInRoleWrite:              # Required by agent base type
    type: string
    # readOnly: true                     # Add if Appliance model (rp-determined)
    x-arm-mutability: rp-determined
    x-arm-baseTypeRequirement: required

# AgentDefinition object definition
AgentDefinition:
  type: object
  required: ["model", "instructions"]
  properties:
    model:
      type: string
      description: "Model identifier (RP-defined)"
      x-arm-mutability: rp-determined
      x-arm-baseTypeRequirement: required
    modelDeploymentRef:
      type: string
      description: "Optional RP-specific reference to an underlying model deployment"
      x-arm-mutability: rp-determined
      x-arm-baseTypeRequirement: optional
    instructions:
      type: string
      description: "System prompt / behavioral instructions"
      x-arm-mutability: rp-determined
      x-arm-baseTypeRequirement: required

# ToolBinding object definition
ToolBinding:
  type: object
  required: ["type", "name"]
  properties:
    type:
      type: string
      description: "RP-defined tool type discriminator"
      x-arm-mutability: rp-determined
      x-arm-baseTypeRequirement: required
    name:
      type: string
      description: "Tool name/identifier"
      x-arm-mutability: rp-determined
      x-arm-baseTypeRequirement: required
```

### Base Type Validation Pipeline

**Validation Points:**
1. **Swagger Check-in**: Validates OpenAPI spec includes required base type properties with correct types and schemas
  - Validates the RP includes all base properties marked `x-arm-baseTypeRequirement: required`.
  - If the RP includes any base properties marked `optional`, validates they match the base type schema.
2. **Mutability Check**: Verifies `readOnly` annotations are consistent with the base type's mutability classifications:
  - The linter reads `x-arm-mutability` from the **ARM-owned base type swagger** (the source of truth for `always-readonly` vs `always-writable` vs `rp-determined`).
  - `always-readonly` fields must be marked `readOnly: true` in the RP swagger.
  - `always-writable` fields must **not** be marked `readOnly: true` in the RP swagger.
  - `rp-determined` fields may be either writable or read-only; the RP indicates its choice via `readOnly: true` (or omission) and documents the deployment model.
3. **Child Resource Check**: Confirms required child resource types are defined in the swagger with their minimum schemas
  - Validates the RP includes all child resource types marked `x-arm-baseTypeRequirement: required` (conversations, responses).
4. **Manifest Check-in**: Confirms ARM manifest properly declares base type inheritance
5. **Runtime**: ARM validates resource payloads match declared base types

## Future Roadmap

### Additional Base Types (Planned)
**TBD**

### Enhanced Capabilities (TBD)
- **Multi-inheritance** - Resources inheriting from multiple base types
- **Dynamic validation** - Runtime enforcement of base type contracts
- **Cross-base operations** - Operations spanning multiple base types


## RP Developer Walkthrough: Creating Microsoft.Teams/TeamsAgents

This section walks through how a Resource Provider developer would create a new agent-based resource type using the base type system. We'll use the **Microsoft.Teams/TeamsAgents** example to show the complete development process.

### Development Steps

**1. Review Agent Base Type Specification**
- Study the required properties: `displayName`, `description`, `definition`, `tools`, `requiredBuiltInRoleReadOnly`, `requiredBuiltInRoleWrite`, `identity`
- Review required child resources: conversations, responses
- Determine deployment model: **Appliance** (most base properties read-only) vs **Platform** (deployer-writable)
- Review field mutability classifications to decide which `rp-determined` fields to mark `readOnly: true`

**2. Design Teams-Specific Schema**

Teams will define a schema that adheres to the baseType they want to adopt and add their own properties.

**Example Microsoft.Teams/TeamsAgents json schema**
```json
{
  "type": "Microsoft.Teams/TeamsAgents",
  "baseTypes": [
    {
      "baseType": "agent",
      "version": "2026-04-01"
    }
  ],                                    // Will be injected by ARM
  "properties": {
    // Required base properties
    "displayName": "Teams Support Bot",
    "description": "Assist users in Teams channels and conversations",
    "definition": {
      "model": "gpt-4o-mini",
      "instructions": "You are a helpful Teams assistant. Help users find information, answer questions, and manage conversations in Teams channels."
    },
    "tools": [
      {
        "type": "Function",
        "name": "search_messages"
      }
    ],
    "requiredBuiltInRoleReadOnly": "Reader",
    "requiredBuiltInRoleWrite": "Contributor",
    
    // Teams-specific properties
    "chatChannels": ["general", "announcements"],
    "conversationState": "active",
    "teamIntegration": {
      "scope": "organization",
      "permissions": ["read-messages", "post-messages"]
    },
    "messageHandlers": [
      "mention-detection",
      "command-parsing",
      "sentiment-analysis"
    ]
  }
}
```


**3. Review Design with Modeling Office Hours**
- **Schedule Review Session**: Book time with ARM modeling office hours team
- **Present Schema Design**: Walk through the Teams-specific schema and base type usage
- **Validate Approach**: Confirm proper inheritance patterns and base type compliance
- **Address Feedback**: Incorporate modeling team recommendations and best practices
- **Get Design Approval**: Receive sign-off on schema design before implementation

**4. Update OpenAPI Specification**

The RP Developer will then publish a new API spec to the spec repo for review. This is the first review in the validation pipeline, where our Swagger linters will ensure conformity with the base type schema.

- **Commit Swagger Spec**: Submit OpenAPI specification to swagger repository
- **BaseType Linters Execute**: Automated validation runs on the committed swagger
  - Validates required agent properties are present (`displayName`, `description`, `definition`, `tools`, `requiredBuiltInRoleReadOnly`, `requiredBuiltInRoleWrite`)
  - Validates required child resource types are defined (conversations, responses)
  - Confirms proper `$ref` usage to ARM base type definitions
  - Checks `baseTypes` field is marked `readOnly: true`
  - Verifies managed identity requirement is declared
  - Ensures property types match base type specification
  - Validates `readOnly` annotations are consistent with mutability classifications
- **Fix Validation Errors**: Address any linter failures and resubmit
- **Swagger Approval**: Once linters pass, swagger is approved and merged

**4.1 Example TeamsAgents swagger**
```yaml
# In Microsoft.Teams swagger spec
Microsoft.Teams/TeamsAgents:
  allOf:
    - $ref: '#/definitions/AgentBaseType'  # Reference to agent base schema
    - type: object
      properties:
        properties:
          allOf:
            - $ref: '#/definitions/AgentProperties'  # Inherits agent base properties
            - type: object
              properties:
                # Teams-specific properties only
                chatChannels:
                  type: array
                  items:
                    type: string
                  description: "Teams channels this agent can access"
                conversationState:
                  type: string
                  enum: ["active", "idle", "disabled"]
                  description: "Current conversation state"
                teamIntegration:
                  type: object
                  properties:
                    scope:
                      type: string
                      enum: ["organization", "team", "channel"]
                    permissions:
                      type: array
                      items:
                        type: string
                        enum: ["read-messages", "post-messages", "manage-channels"]
                messageHandlers:
                  type: array
                  items:
                    type: string
                  description: "List of message processing capabilities"
```

**4.2 ARM-Provided Base Type Definitions (for reference)**
```yaml
# These definitions are provided by the ARM platform - RPs reference them, don't redefine
definitions:
  AgentBaseType:
    type: object
    properties:
      baseTypes:
        type: array
        items:
          type: object
          properties:
            baseType:
              type: string
              description: "Name of the base type"
            version:
              type: string
              format: date
              description: "API version of the base type schema"
          required: ["baseType", "version"]
        readOnly: true
        description: "Base types this resource inherits from"
        x-arm-mutability: always-readonly
      identity:
        $ref: '#/definitions/ManagedIdentity'
        description: "Required managed identity for agent"
  
  AgentProperties:
    type: object
    required: ["displayName", "description", "definition", "tools", "requiredBuiltInRoleReadOnly", "requiredBuiltInRoleWrite"]
    properties:
      displayName:
        type: string
        description: "Human-friendly agent name"
        x-arm-mutability: rp-determined
      description:
        type: string
        description: "Purpose/behavior summary"
        x-arm-mutability: rp-determined
      definition:
        $ref: '#/definitions/AgentDefinition'
        description: "Inline agent definition"
        x-arm-mutability: rp-determined
      tools:
        type: array
        items:
          $ref: '#/definitions/ToolBinding'
        description: "Tool bindings enabled for the agent"
        x-arm-mutability: rp-determined
      requiredBuiltInRoleReadOnly:
        type: string
        description: "Minimum Azure built-in role for read-only mode"
        x-arm-mutability: rp-determined
      requiredBuiltInRoleWrite:
        type: string
        description: "Minimum Azure built-in role for write mode"
        x-arm-mutability: rp-determined

  AgentDefinition:
    type: object
    required: ["model", "instructions"]
    properties:
      model:
        type: string
        description: "Model identifier (RP-defined)"
        x-arm-mutability: rp-determined
      modelDeploymentRef:
        type: string
        description: "Optional RP-specific reference to an underlying model deployment"
        x-arm-mutability: rp-determined
      instructions:
        type: string
        description: "System prompt / behavioral instructions"
        x-arm-mutability: rp-determined

  ToolBinding:
    type: object
    required: ["type", "name"]
    properties:
      type:
        type: string
        description: "RP-defined tool type discriminator"
        x-arm-mutability: rp-determined
      name:
        type: string
        description: "Tool name/identifier"
        x-arm-mutability: rp-determined
```

**5. Manifest Validation (Cross-Reference Check)**
- **Submit ARM Manifest**: Update resource provider manifest with baseTypes declaration
```json
{
  "resourceTypes": [{
    "resourceType": "TeamsAgents",
    "baseTypes": [
      {
        "baseType": "agent",
        "version": "2026-04-01"
      }
    ],
    "apiVersions": ["2024-01-01"],
    "locations": ["global"],
    "properties": {
      "requiresIdentity": true,
      "isProxy": false
    }
  }]
}
```
- **Cross-Reference Validation**: Automated system checks manifest against approved swagger
  - Verifies manifest declares `"baseTypes": [{"baseType": "agent", "version": "2026-04-01"}]` for the resource
  - Confirms swagger schema matches manifest baseTypes declaration
  - Validates consistency between swagger inheritance and manifest claims
- **Manifest Approval**: Once cross-reference validation passes, manifest is approved

**6. Implement Resource Provider Service**
```csharp
public class TeamsAgentService : IAgentService
{
    // Required base operations
    public async Task StartAsync(string resourceId) { /* Teams-specific start logic */ }
    public async Task StopAsync(string resourceId) { /* Teams-specific stop logic */ }
    public async Task<AgentStatus> GetStatusAsync(string resourceId) { /* Return status */ }
    
    // Teams-specific operations
    public async Task JoinChannelAsync(string resourceId, string channel) { /* Teams logic */ }
    public async Task ProcessMessageAsync(string resourceId, TeamsMessage message) { /* Handle messages */ }
}
```

**7. Resource Provider Rollout & Test**
- **Rollout RP Manifest**: Release the resource provider manifest to Azure regions
- **Register**: Register the provider to a test sub.
- **Create Test Resources**: Deploy TeamsAgent resources in development subscription
- - **BaseTypes Injection**: ARM automatically injects `baseTypes: [{"baseType": "agent", "version": "2026-04-01"}]` field at runtime
- **Validate Base Type Behavior**: 
  - Confirm `baseTypes` field appears in resource JSON with proper structure
  - Test unified agent queries work (`az resource list --query "[?baseTypes[0].baseType=='agent']"`)
  - Verify agent appears in "All Agents" portal view
- **Test Teams-Specific Functionality**: Validate Teams-specific operations work correctly
- **End-to-End Validation**: Test complete customer scenarios


---

**Questions?** Contact Evan Hissey (EVANHI) & Jenny Hunter (JEHUNTE)

*Document Version: 2.0 | Last Updated: April 10, 2026*