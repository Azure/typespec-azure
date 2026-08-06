# Demo Plan: Breaking Change Tool in azure-rest-api-specs

## Objective

Demonstrate `@azure-tools/typespec-breaking-change` running against a real spec in
`markcowl/azure-rest-api-specs` (fork of Azure/azure-rest-api-specs), showing:
1. Detection of breaking changes across api-versions
2. Suppression workflow with `@approvedBreakingChange`
3. CI-style JSON + Markdown output suitable for PR review
4. Performance on a real multi-version spec

---

## Prerequisites

1. **Fork**: `markcowl/azure-rest-api-specs` based on `main` of `Azure/azure-rest-api-specs`
2. **Branch**: `demo/breaking-change-tool` created from main
3. **Tool**: `@azure-tools/typespec-breaking-change` published or linked locally

---

## Demo Scenario: ContainerService/fleet

**Why this spec**: 13 versions (3 stable, 10 preview), 42 operations, active development.
Demonstrates real-world version complexity without being overwhelming for a demo.

### Step 1: Set up the tool in the fork

```bash
# In the fork repo
cd eng/tools
# Option A: npm link to local build
npm link @azure-tools/typespec-breaking-change

# Option B: Add as workspace dependency
# Add to eng/tools/package.json or a new eng/tools/breaking-change-check/ directory
```

**Alternative (recommended for demo)**: Run directly from the typespec-azure worktree:
```bash
cd /path/to/typespec-azure/packages/typespec-breaking-change
node dist/src/cli/cli.js /path/to/azure-rest-api-specs/specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/main.tsp
```

### Step 2: Baseline run (no changes — shows tool works)

```bash
typespec-breaking-change \
  specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/main.tsp \
  --json-output demo-output/fleet-baseline.json \
  --markdown-output demo-output/fleet-baseline.md
```

**Expected output**: 147 findings across 8 version pairs (existing cross-version diffs).
This demonstrates the tool analyzing the full version history.

### Step 3: Introduce a breaking change

Create a demo branch with an intentional breaking change:

```bash
git checkout -b demo/introduce-breaking-change
```

Edit `specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/fleet.tsp`:
- Remove a required property from `FleetProperties` (e.g., remove `hubProfile`)
- Or make an optional response property required

```typespec
// BEFORE:
model FleetProperties {
  hubProfile?: FleetHubProfile;
  // ...
}

// AFTER (breaking: removed property):
model FleetProperties {
  // hubProfile removed
  // ...
}
```

### Step 4: Run tool showing the new finding

```bash
typespec-breaking-change \
  --entry specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/main.tsp \
  --base origin/main \
  --json-output demo-output/breaking-change.json \
  --markdown-output demo-output/breaking-change.md \
  --github-annotations \
  --fail-on-breaking
```

**Expected**: Exit code 1, new finding for `ResponsePropertyRemoved` with:
- Source location pointing to the removed property
- Suppression guidance showing the exact decorator to add

### Step 5: Demonstrate suppression workflow

Add suppression to the model:

```typespec
model FleetProperties {
  @approvedBreakingChange("hubProfile moved to separate resource in 2025-03-01", "ResponsePropertyRemoved")
  hubProfile?: FleetHubProfile;  // (or on the model if property is removed)
}
```

Re-run the tool:
```bash
typespec-breaking-change \
  specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/main.tsp \
  --fail-on-breaking
```

**Expected**: Exit code 0, the finding is now suppressed.

### Step 6: Show CI integration outputs

Display the generated files:
- `demo-output/breaking-change.json` — structured report for automation
- `demo-output/breaking-change.md` — PR comment with findings table

---

## Demo Scenario 2: Preview-only spec (no breaking changes possible)

Run against a spec that only has preview versions (e.g., AppConfiguration if it still has no stable):

```bash
typespec-breaking-change \
  specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration/main.tsp
```

**Expected**: Exit code 0, output says "No cross-version comparisons needed: all versions are preview"

---

## Demo Timeline (5-minute walkthrough)

| Time | Action | Shows |
|------|--------|-------|
| 0:00 | Intro slide: what the tool does | Architecture |
| 0:30 | Run baseline against fleet (pre-recorded) | Performance, version discovery |
| 1:30 | Show JSON report structure | CI integration |
| 2:00 | Show introduced breaking change | Detection accuracy |
| 2:30 | Show suppression workflow | Developer experience |
| 3:30 | Show markdown PR comment | Review experience |
| 4:00 | Show preview-only handling | Graceful edge cases |
| 4:30 | Performance comparison table | Scaling |
| 5:00 | Next steps slide | Production path |

---

## Files to Prepare

1. `demo-output/fleet-baseline.json` — pre-generated baseline report
2. `demo-output/fleet-baseline.md` — pre-generated markdown summary
3. `demo-output/breaking-change.json` — report showing the introduced break
4. `demo-output/breaking-change.md` — markdown showing the break + suppression hint
5. A git branch with the intentional breaking change applied
6. A git branch with the suppression applied (showing the fix)

---

## Fallback: Run Without Fork

If the fork isn't ready, all demos can run from the local environment:
```bash
cd typespec-azure/packages/typespec-breaking-change
node dist/src/cli/cli.js C:/Users/markcowl/session2/azure-rest-api-specs/specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/main.tsp --json-output demo.json --markdown-output demo.md
```

This already works today and produces the same output.
