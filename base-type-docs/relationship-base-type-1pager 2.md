# Relationship Base Type — Implementation 1-Pager

## Context

The [SG and Relationships] meeting (June 22, 2026) decided that **Relationship base types are P0** and the design is nearly complete. The Agent base type ([PR #4621](https://github.com/Azure/typespec-azure/pull/4621)) provides the exact pattern to follow.

---

## What Gets Built

Following the Agent base type PR pattern, implement a `Relationship` base type in `typespec-azure-resource-manager`. This gives all relationship resources a common schema contract, enables `IsRelationshipType()` detection, and allows policy targeting.

---

## Work Items

### 1. TypeSpec Model Definitions
**File:** `packages/typespec-azure-resource-manager/lib/base-types/relationship.tsp`

Define the core models:

| Model | Purpose |
|-------|---------|
| `RelationshipEndpoint` | Structured source/target object (`id` (free-form string), `type?`, `tenant?`) — not constrained to ARM resource IDs |
| `RelationshipProperties` | Base property bag: `baseTypes`, `source`, `target`, `relationshipType`, `lastSeenTime?`, `originInformation?`, `discoveryInformation?`, `provisioningState` |
| `OriginInformation` | Origin metadata (`relationshipOriginType`: UserExplicitlyCreated, Discovery, etc.) |
| `Relationship<Properties>` | Resource template (extension resource anchored on source scope) applying `@azureBaseType(#[#{ baseType: "Relationship", version: "2024-06-01" }])` |

**Key design decisions:**
- Relationship = **ARM extension resource** at `/{scope}/providers/Microsoft.Relationships/{type}/{name}`
- Source and target are **not constrained to ARM resources** — endpoints use a free-form `id` string to support external entities (e.g., Entra objects, third-party systems, non-ARM identifiers)
- Design converges on **structured source/target objects** (not flat `sourceId`/`targetId`)

### 2. Register in Base Types Index
**File:** `packages/typespec-azure-resource-manager/lib/base-types/base-types.tsp`

Import `relationship.tsp` (same as `agent.tsp` is imported).

**File:** `packages/typespec-azure-resource-manager/lib/arm.tsp`

Add `import "./base-types/relationship.tsp";`

### 3. Linting Rule
**File:** `packages/typespec-azure-resource-manager/src/rules/arm-relationship-base-type-required-properties.ts`

Validate that resources decorated with `@azureBaseType` for `"Relationship"`:
- Include a `target` property (with `id`)
- Include `provisioningState`
- Are extension resources (not tracked resources)

Register in `src/linter.ts` and the resource-manager ruleset.

### 4. Sample Spec
**File:** `packages/samples/specs/resource-manager/resource-types/relationship/main.tsp`

A Contoso sample (e.g., `Microsoft.ContosoRelationships/dependencyOf`) showing:
- Extension resource on source scope
- RP-specific properties extending `RelationshipProperties`
- Standard CRUD operations

### 5. Generated OpenAPI Output
**File:** `packages/samples/test/output/azure/resource-manager/resource-types/relationship/@azure-tools/typespec-autorest/2024-06-01/openapi.json`

Auto-generated from the sample — validates the output shape matches expected ARM format.

### 6. Tests
**File:** `packages/typespec-azure-resource-manager/test/rules/arm-relationship-base-type-required-properties.test.ts`

Test cases:
- ✅ Valid relationship with target + provisioningState
- ❌ Missing target property
- ❌ Not an extension resource
- ✅ Non-Relationship base types unaffected

### 7. Documentation Updates
- `packages/typespec-azure-resource-manager/README.md` — add linter rule row
- `website/src/content/docs/docs/libraries/azure-resource-manager/reference/data-types.md` — document `RelationshipProperties`, `RelationshipEndpoint`, `Relationship<T>`
- New rule doc page

### 8. Changelog
**File:** `.chronus/changes/add-relationship-base-type-<date>.md`

---

## Schema Reference (Target State)

```json
{
  "id": "/{scope}/providers/Microsoft.Relationships/dependencyOf/myRelName",
  "type": "Microsoft.Relationships/dependencyOf",
  "name": "myRelName",
  "properties": {
    "baseTypes": [{ "baseType": "Relationship", "version": "2024-06-01" }],
    "source": {
      "id": "/subscriptions/.../providers/Microsoft.Compute/virtualMachines/vm1"
    },
    "target": {
      "id": "https://graph.microsoft.com/v1.0/devices/device-uuid-1234",
      "type": "Entra/Device",
      "tenant": "contoso.com"
    },
    "relationshipType": "Microsoft.Relationships/dependencyOf",
    "originInformation": {
      "relationshipOriginType": "UserExplicitlyCreated"
    },
    "lastSeenTime": "2026-06-22T11:00:00Z",
    "provisioningState": "Succeeded"
  }
}
```

---

## Open Questions (from meeting + chat)

| # | Question | Status |
|---|----------|--------|
| 1 | Backfill existing `Microsoft.Relationships/*` resources with `baseTypes` property? | Open — may require migration |
| 2 | Breaking change if `baseTypes` becomes required? | Currently experimental, not enforced |
| 3 | RBAC on relationship base types? | ❌ Not in scope — use existing roles (`* read`) |
| 4 | `IsRelationshipType(string type)` helper in ARG/ARN? | Proposed — parallel workstream |

---

## Dependencies & Coordination

- **typespec-azure PR:** Follow PR #4621 pattern exactly
- **Relationships RP team:** Validate schema against current swagger
- **ARG/ARN team:** `IsRelationshipType()` helper (can proceed in parallel)
- **Platform/PaaS team:** No RBAC dependency for P0

---

## Estimated Effort

| Item | Est. |
|------|------|
| TypeSpec models + decorator | 1-2 days |
| Linting rule + tests | 1 day |
| Sample spec + generated output | 0.5 day |
| Docs + changelog | 0.5 day |
| Review + iteration | 1-2 days |
| **Total** | **~4-6 days** |

---

## References

- [PR #4621 — Agent base type (pattern to follow)](https://github.com/Azure/typespec-azure/pull/4621)
- [Relationship Namespace Decomposition.docx](https://microsoft.sharepoint.com/teams/GovernanceVteam/_layouts/15/Doc.aspx?sourcedoc=%7BB4F30B96-C6A3-4B06-A506-BE051F2D8D89%7D)
- [Relationships RP Strongly Typed Apr 17.docx](https://microsoft.sharepoint.com/teams/GovernanceVteam/_layouts/15/Doc.aspx?sourcedoc=%7B4975E478-3EFF-46AC-AD88-526C16E662E8%7D)
- [Proposal to standardize service topology constructs.docx](https://microsoft.sharepoint.com/teams/azureresourcemanagerteam/_layouts/15/Doc.aspx?sourcedoc=%7BB83DBCC6-E880-4F5F-B71F-B90C3847CCC7%7D)
- [Relationship Schema Proposed Changes (Loop)](https://loop.cloud.microsoft/)
- [Varun's agent.tsp sample](https://microsoft-my.sharepoint.com/personal/vayada_microsoft_com/Documents/Microsoft%20Teams%20Chat%20Files/agent.tsp)
