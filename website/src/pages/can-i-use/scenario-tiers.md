# Scenario Tier Configuration Guide

The **Can I Use** dashboard supports filtering coverage scenarios by priority tiers.

## How Tiers Work

Tiers are configured in [`website/src/pages/can-i-use/scenario-tiers.ts`](./scenario-tiers.ts).

- **Core** (default) — All scenarios are considered Core unless explicitly listed in another tier. This tier represents the critical scenarios that every emitter is expected to support.
- **Backlog** — Scenarios that are non-critical or not yet required for all emitters. These can be de-prioritized and filtered out on the dashboard.

Because `default` is set to `"Core"`, the `Core` array should remain **empty** — every scenario not explicitly assigned to another tier is automatically Core.

## Adding Scenarios to Backlog

To move a scenario out of the Core tier, add its name to the `Backlog` array in `scenario-tiers.ts`:

```ts
export const scenarioTiers = {
  default: "Core",
  tiers: {
    Core: [],
    Backlog: [
      "Azure_ClientGenerator_Core_Access_PublicOperation",
      "Azure_ClientGenerator_Core_Access_InternalOperation",
    ],
  },
};
```

## Finding Scenario Names

Scenario names must match **exactly** as they appear in the Spector Scenario name.

You can find scenario names by looking at the `mockapi.ts` files in `packages/azure-http-specs/specs/` or `core/packages/http-specs/specs/`. Scenario names are the property keys on the `Scenarios` object:

```ts
// packages/azure-http-specs/specs/client/structure/client-operation-group/mockapi.ts
export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_Structure_ClientOperationGroup = passOnSuccess([...]);
Scenarios.Client_Structure_AnotherClientOperationGroup = passOnSuccess([...]);
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//         These are the scenario names to use in tier config
```

## Making Changes

1. Edit `scenario-tiers.ts` to add or remove scenario names from the `Backlog` array
2. Submit a PR to the [typespec-azure](https://github.com/Azure/typespec-azure) repository
3. Once merged, the dashboard will reflect the updated tier assignments
