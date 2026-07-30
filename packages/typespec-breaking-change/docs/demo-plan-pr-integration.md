# Demo Plan: PR Integration with Annotations and Comments

## Objective

Demonstrate the full **pull request workflow** for `@azure-tools/typespec-breaking-change`:
a PR that introduces a breaking change gets annotated inline, receives a summary comment,
and the author uses suppression to approve the change — all visible in the GitHub PR UI.

---

## Overview

| Step | Actor | What happens |
|------|-------|--------------|
| 1 | Author | Opens PR with a breaking change to a TypeSpec spec |
| 2 | CI | Runs breaking-change tool, posts annotations + comment |
| 3 | Author | Sees inline annotation on the breaking line |
| 4 | Author | Adds `@approvedBreakingChange` to suppress |
| 5 | CI | Re-runs, posts updated comment showing suppression |
| 6 | Reviewer | Sees clean PR with documented approval |

---

## Prerequisites

- Fork: `markcowl/azure-rest-api-specs`
- GitHub Actions workflow configured (see Step 1)
- Tool linked or installed in the repo

---

## Step 1: Set up the GitHub Actions workflow

Create `.github/workflows/breaking-change-check.yml`:

```yaml
name: Breaking Change Check

on:
  pull_request:
    paths:
      - 'specification/**/*.tsp'

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for base comparison

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install breaking-change tool
        run: |
          npm install -g @azure-tools/typespec-breaking-change
          # Or: npm link /path/to/local/build

      - name: Run breaking-change analysis
        id: analysis
        run: |
          typespec-breaking-change \
            specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/main.tsp \
            --json-output /tmp/report.json \
            --markdown-output /tmp/report.md \
            --github-annotations \
            --fail-on-breaking
        continue-on-error: true

      - name: Post PR comment
        if: always()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: /tmp/report.md
          header: breaking-change-report

      - name: Fail if breaking changes found
        if: steps.analysis.outcome == 'failure'
        run: exit 1
```

---

## Step 2: Create a PR with a breaking change

Branch from main and edit the fleet spec:

```bash
git checkout -b demo/pr-breaking-change origin/main
```

Edit `specification/containerservice/resource-manager/Microsoft.ContainerService/fleet/fleet.tsp`:

```diff
 model FleetProperties {
   provisioningState?: FleetProvisioningState;
-  hubProfile?: FleetHubProfile;
 }
```

Or make a response property required:

```diff
 model FleetMember {
   name: string;
-  clusterResourceId?: string;
+  clusterResourceId: string;
 }
```

Push and open the PR:

```bash
git add -A && git commit -m "Remove hubProfile from FleetProperties"
git push origin demo/pr-breaking-change
# Open PR via GitHub UI
```

---

## Step 3: CI produces annotations and PR comment

### What the author sees in the PR:

**Inline annotation** (appears on the diff view next to the changed line):

```
⚠️ Breaking Change: ResponsePropertyRemoved
  Property 'hubProfile' was removed from the response body.
  Phase: cross-version (2024-04-01 → 2025-03-01)
  Suppress: @approvedBreakingChange("reason", "ResponsePropertyRemoved")
```

**PR comment** (sticky, updated on each push):

```markdown
## 🔍 Breaking Change Analysis

**Status**: ❌ 2 breaking changes detected

| # | Kind | Element | Operation | Phase |
|---|------|---------|-----------|-------|
| 1 | ResponsePropertyRemoved | body.properties.hubProfile | GET /fleets/{} | 2024-04-01 → 2025-03-01 |
| 2 | RequestPropertyRemoved | body.properties.hubProfile | PUT /fleets/{} | 2024-04-01 → 2025-03-01 |

### How to suppress

Add `@approvedBreakingChange` to the affected declaration:

\```typespec
model FleetProperties {
  @approvedBreakingChange("hubProfile moved to separate resource", "ResponsePropertyRemoved")
  @removed(Versions.v2025_03_01)
  hubProfile?: FleetHubProfile;
}
\```
```

**CI status check**: ❌ Failed (red X on the PR)

---

## Step 4: Author adds suppression

The author follows the guidance from the annotation/comment:

```diff
 model FleetProperties {
   provisioningState?: FleetProvisioningState;
+  @approvedBreakingChange("hubProfile moved to FleetHub resource in 2025-03-01")
+  @removed(Versions.v2025_03_01)
+  hubProfile?: FleetHubProfile;
 }
```

Push the fix:

```bash
git add -A && git commit -m "Approve breaking change: hubProfile removal"
git push origin demo/pr-breaking-change
```

---

## Step 5: CI re-runs, PR is green

**Updated PR comment**:

```markdown
## 🔍 Breaking Change Analysis

**Status**: ✅ No unsuppressed breaking changes

| Suppressed | Kind | Reason |
|------------|------|--------|
| ✓ | ResponsePropertyRemoved | hubProfile moved to FleetHub resource in 2025-03-01 |
| ✓ | RequestPropertyRemoved | hubProfile moved to FleetHub resource in 2025-03-01 |

All breaking changes have been reviewed and approved.
```

**CI status check**: ✅ Passed (green checkmark)

---

## Step 6: Reviewer sees clean PR

The reviewer sees:
1. The structural change in the TypeSpec diff
2. The `@approvedBreakingChange` decorator with a clear reason
3. Green CI confirming the tool validated the suppression
4. The PR comment showing the suppressed findings with reasons

---

## Demo Timeline (5 minutes)

| Time | Action |
|------|--------|
| 0:00 | Show the CI workflow YAML |
| 0:30 | Show the PR with the breaking change (pre-staged) |
| 1:00 | Point to inline annotations on the diff |
| 1:30 | Show the PR comment with findings table |
| 2:00 | Show the failing CI check |
| 2:30 | Show the fix commit adding `@approvedBreakingChange` |
| 3:00 | Show the updated PR comment (green) |
| 3:30 | Show the JSON report (for automation consumers) |
| 4:00 | Discuss: operation-level vs property-level suppression |
| 4:30 | Discuss: `since` parameter for versioned approvals |
| 5:00 | Q&A |

---

## Key talking points for PR integration

1. **Zero-config detection**: Tool analyzes the full version history automatically
2. **Inline guidance**: Annotations tell the author exactly what to do
3. **Sticky comment**: Always shows current state (not stale from previous runs)
4. **Fail-fast**: CI blocks merge until all breaking changes are either fixed or approved
5. **Audit trail**: `@approvedBreakingChange` reason is permanently in the source code
6. **Scoped suppression**: Can approve per-property, per-operation, or per-namespace

---

## Comparison: CLI vs PR workflow

| Feature | CLI mode | PR mode |
|---------|----------|---------|
| Detection | Same engine | Same engine |
| Output | Console + files | Annotations + comment |
| Suppression | Add decorator, re-run | Add decorator, push |
| Review | Manual | Visible in PR UI |
| Blocking | `--fail-on-breaking` exit code | CI status check |
| Audit | JSON report | Git history + PR comment |
