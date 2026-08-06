# Source Tracing Evaluation on Real ARM Specs

This evaluation was generated with `scripts/evaluate-source-tracing.mjs` against the real ARM specs listed below. The script compiles each spec with the TypeSpec compiler, runs Phase B with `analyzeProgram()`, resolves each finding through `resolveFindingLocation()`, and validates Phase A with `analyzeBaseAndHead(program, program, { phase: "same-version" })`.

## Scope and spec selection

- **Network**: `C:\Users\markcowl\session2\azure-rest-api-specs\specification\network\resource-manager\Microsoft.Network\Network\Network`
- **AppConfiguration**: `C:\Users\markcowl\session2\azure-rest-api-specs\specification\appconfiguration\resource-manager\Microsoft.AppConfiguration\AppConfiguration`
- **ContainerService/fleet**: `C:\Users\markcowl\session2\azure-rest-api-specs\specification\containerservice\resource-manager\Microsoft.ContainerService\fleet`

The task text listed `Contoso.Management` for the third spec, but the accompanying metadata (`12-42` operations, `13` versions, `8` Phase B pairs) matches `ContainerService/fleet`, so this evaluation used `fleet`.

## 1. Summary Table

| Spec | Findings | Direct | Origin | Base | ParentModel | Operation | Namespace | Unresolved |
|------|---------:|-------:|-------:|-----:|------------:|----------:|----------:|-----------:|
| Network | 26 | 24 | 0 | 0 | 0 | 2 | 0 | 0 |
| AppConfiguration | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ContainerService/fleet | 70 | 62 | 0 | 0 | 0 | 8 | 0 | 0 |

## 2. Per-Spec Analysis

### Network

- **Compile status**: 0 errors
- **Versions / pairs**: 2 stable versions (`2025-05-01`, `2025-07-01`), 1 Phase B pair
- **Operation counts**: 739 → 768
- **Phase A self-compare**: 0 findings across 2 same-version comparisons; no crash

#### Finding counts

- Raw classified findings before orchestrator dedup/merge: **71**
- After source-type dedup: **42**
- After request/response merge: **26**
- Final findings after suppression: **26**

Dedup + merge reduced report volume by **63.4%** overall (`71 -> 26`).

#### Resolution quality

- **Origin resolution rate** (`finding.diff.origin` present): **24 / 26 = 92.3%**
- **Source link resolution rate** (`resolveFindingLocation()` returned a location): **26 / 26 = 100%**
- **Trace-level breakdown**:
  - `direct`: 24
  - `operation`: 2

#### Why anything fell back below declaration level

1. **`OperationAdded`**  
   - Pair: `2025-05-01 -> 2025-07-01`
   - Operation: `GET /subscriptions/{}/resourceGroups/{}/providers/Microsoft.Network/ddosCustomPolicies`
   - Why: operation lifecycle diffs do not have a model/property declaration anchor, so operation-level fallback is expected.

2. **`RequestQueryParameterAdded` on `query.createAfcControlPlane`**  
   - Pair: `2025-05-01 -> 2025-07-01`
   - Operation: `PUT /subscriptions/{}/resourceGroups/{}/providers/Microsoft.Network/azureFirewalls/{}` 
   - Why: the diff is attached to a wire-level query parameter rather than a `ModelProperty` with an origin or `sourceProperty` chain. The head-side type was an intrinsic (`never`), so resolution fell back to the operation declaration.

### AppConfiguration

- **Compile status**: 0 errors
- **Versions / pairs**: 3 preview versions, **0** Phase B pairs
- **Operation counts**: 29, 29, 32
- **Phase A self-compare**: 0 findings across 3 same-version comparisons; no crash

#### Finding counts

- Raw classified findings before orchestrator dedup/merge: **0**
- After source-type dedup: **0**
- After request/response merge: **0**
- Final findings after suppression: **0**

#### Resolution quality

- **Origin resolution rate**: not applicable (no Phase B findings)
- **Source link resolution rate**: not applicable (no Phase B findings)
- **Trace-level breakdown**: all zero

#### Interpretation

This spec exercised the compile + Phase A pipeline successfully, but because all available versions are preview versions there was no stable baseline and therefore no Phase B comparison work to do.

### ContainerService/fleet

- **Compile status**: 0 errors
- **Versions / pairs**: 13 versions, 8 Phase B pairs
- **Stable baselines**: `2023-10-15`, `2024-04-01`, `2025-03-01`
- **Operation counts**: 12 → 42 across the version set
- **Phase A self-compare**: 0 findings across 13 same-version comparisons; no crash

#### Finding counts

- Raw classified findings before orchestrator dedup/merge: **143**
- After source-type dedup: **108**
- After request/response merge: **70**
- Final findings after suppression: **70**

Dedup + merge reduced report volume by **51.0%** overall (`143 -> 70`).

#### Resolution quality

- **Origin resolution rate** (`finding.diff.origin` present): **62 / 70 = 88.6%**
- **Source link resolution rate** (`resolveFindingLocation()` returned a location): **70 / 70 = 100%**
- **Trace-level breakdown**:
  - `direct`: 62
  - `operation`: 8

#### Why anything fell back below declaration level

All 8 non-direct findings were **`OperationAdded`** findings, one per compared version pair:

- `2023-10-15 -> 2024-02-02-preview`: `POST .../updateRuns/{}/skip`
- `2023-10-15 -> 2024-04-01`: `POST .../updateRuns/{}/skip`
- `2024-04-01 -> 2024-05-02-preview`: `GET .../autoUpgradeProfiles/{}`
- `2024-04-01 -> 2025-03-01`: `GET .../autoUpgradeProfiles/{}`
- `2025-03-01 -> 2025-04-01-preview`: `GET .../gates/{}`
- `2025-03-01 -> 2025-08-01-preview`: `GET .../managedNamespaces/{}`
- `2025-03-01 -> 2026-02-01-preview`: `GET .../managedNamespaces/{}`
- `2025-03-01 -> 2026-03-02-preview`: `GET .../clusterMeshProfiles/{}`

These are operation lifecycle diffs with no property/type declaration anchor, so operation-level resolution is the correct terminal fallback.

## 3. Failure Analysis

There were **no unresolved findings** and **no namespace-level fallbacks** in the evaluated specs. All non-direct outcomes fell into two categories.

### Category A: Operation lifecycle diffs

- **Count**: 9
- **Trace level**: `operation`
- **Root cause**: by design, operation additions/removals do not have a model/property origin to link to.

Examples:

| Spec | Diff kind | Element path | Example operation | Why it stopped at operation |
|------|-----------|--------------|-------------------|-----------------------------|
| Network | OperationAdded | `""` | `GET /subscriptions/{}/resourceGroups/{}/providers/Microsoft.Network/ddosCustomPolicies` | No base/head type and no origin declaration exist for an operation lifecycle diff. |
| ContainerService/fleet | OperationAdded | `""` | `POST /subscriptions/{}/resourceGroups/{}/providers/Microsoft.ContainerService/fleets/{}/updateRuns/{}/skip` | Same reason; the operation declaration itself is the best available anchor. |
| ContainerService/fleet | OperationAdded | `""` | `GET /subscriptions/{}/resourceGroups/{}/providers/Microsoft.ContainerService/fleets/{}/clusterMeshProfiles/{}` | Same reason. |

### Category B: Wire-level parameter diff without declaration anchor

- **Count**: 1
- **Trace level**: `operation`
- **Root cause**: the query parameter diff was represented at the wire layer and did not retain a declaration-backed `ModelProperty`/origin chain.

Example:

| Spec | Diff kind | Element path | Diff type | Why it stopped at operation |
|------|-----------|--------------|-----------|-----------------------------|
| Network | RequestQueryParameterAdded | `query.createAfcControlPlane` | `headType = Intrinsic:never` | The finding did not carry an origin or parent-model location; only the operation declaration was available. |

## 4. Comparison to Baseline

From `PROTOTYPE-EVALUATION.md`:

- **Network** was previously about **56%** origin coverage.
- **AppConfiguration** was previously about **70%** origin coverage.

### Current results

- **Network**: **92.3%** origin coverage (`24 / 26`)  
  This is a **+36.3 point** improvement and matches the expectation that the B5 template fix would push Network close to the low-90s.

- **AppConfiguration**: **not comparable in this run**  
  The current spec shape produced **0 Phase B findings** because all available versions are preview versions, so there was no stable baseline to compare against. The compile path and Phase A pipeline were still validated successfully.

For additional context, **ContainerService/fleet** reached **88.6%** origin coverage (`62 / 70`) with 100% source-link resolution.

## 5. Recommendations

1. **Track origin coverage separately from selected trace level.**  
   `resolveFindingLocation()` prefers `headSourceLocation` (`direct`) before `origin`, so the trace-level table alone understates how often origin tracing succeeded.

2. **Improve parameter-level source anchoring.**  
   The one remaining non-lifecycle fallback in Network came from a query parameter that did not preserve a declaration-backed source chain.

3. **Add this evaluation script to regression workflows.**  
   Running `scripts/evaluate-source-tracing.mjs` periodically would catch regressions in real ARM specs without needing a full hand-authored analysis each time.

4. **Optionally surface both anchors in reporting.**  
   For diagnostics/markdown reports, exposing both `selectedTraceLevel` and `hasOrigin` would make future investigations easier.
