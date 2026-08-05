# Comprehensive Plan: Next Steps for @azure-tools/typespec-breaking-change

**Created:** 2026-08-04
**Status:** Active planning document

## Executive Summary

The prototype is functional with 364 tests, real-world performance validation, and 4 demo PRs.
This document captures the path from prototype to production-ready tool, organized as:
(A) resolved questions, (B) open questions requiring investigation, (C) prioritized work items.

---

## Part A: Resolved Questions

These were open during design/prototype and are now answered with evidence.

### A1. Performance at Scale ✅

**Answer:** Analysis completes well within CI budget (7x margin on largest specs).
- Network: 739 operations, 2 versions, 1 pair → 7.0s
- Fleet: 42 operations, 13 versions, 8 pairs → 8.4s
- Bottleneck: version mutators (50%) + diff engine (45%)
- No parallelization needed at current scale

**Evidence:** `PROTOTYPE-EVALUATION.md` Q8, `integration-real-spec.test.ts`

### A2. Graph Walker and Cycle Detection ✅

**Answer:** Visited-set with type identity prevents infinite loops. Works on deeply nested ARM models.
**Evidence:** 5 dedicated recursive model tests, Network spec (739 ops) runs without stack overflow.

### A3. Operation Identity Stability ✅

**Answer:** `{method, normalizedPath}` is stable across refactors. Path normalization replaces parameter names with `{}`.
**Evidence:** Network spec correctly matches 739 operations. 11 identity tests.

### A4. Resource Model Directional Split ✅

**Answer:** Request/Response diffs merge into Resource findings post-comparison. Pipeline: dedup → merge → collapse → suppress.
**Evidence:** Scenarios 10-12 in orchestrator tests, all 4 demo PRs.

### A5. Cross-Compilation Suppression Identity ✅

**Answer:** `scanUnversionedSuppressions` fallback matches by `(namespace.model.property, diffKind)` when object identity fails across compilations.
**Evidence:** PR #5 demo, suppression-identity tests.

### A6. Phase A → Phase B Interaction ✅

**Answer:** Changed versions in Phase A feed into Phase B candidates. Only new or changed versions are checked for cross-version breaking changes.
**Evidence:** `orchestrator.ts` lines 157-171. This optimization is already implemented.

### A7. TypeSpec Library Registration ✅

**Answer:** Requires `exports` in package.json + `using Azure.BreakingChange;` in consumer specs.
**Evidence:** Documented in `docs/prototype-dev-guide.md`, verified by PR #5.

---

## Part B: Open Questions Requiring Investigation

### B1. New vs Existing Suppression Differentiation

**Problem:** The current prototype treats ALL suppressed findings as "new" and shows them in the "New Suppressed Breaking Changes" section. The design (Section 6.3) specifies comparing suppressions between base and head to distinguish:
- **NEW:** suppression in head but not base → requires reviewer sign-off
- **EXISTING:** suppression in both → no review needed (don't show prominently)
- **REMOVED:** suppression in base but not head → cleanup or will produce unsuppressed finding
- **MODIFIED:** suppression changed between base and head → re-review

**Current state:** No base-vs-head suppression comparison exists. All suppressed findings show as "new".

**Impact:** In production, long-standing suppressions would generate noise on every PR if we don't filter them.

**Investigation plan:**
1. For Phase B: compare decorators on the same type (by identity) between base and head programs
2. For Phase A: compare head program suppressions against prior head (which is `base` for Phase A)
3. Classify each suppressed finding as NEW/EXISTING/MODIFIED
4. Only show NEW/MODIFIED in the main report; EXISTING in a collapsed section or omitted

**Test scenarios needed:**
- PR with existing suppression unchanged → not shown as "new"
- PR adding new suppression → shown as "new", requires sign-off
- PR modifying suppression reason → shown as "modified"
- Mix of new + existing suppressions in same PR

### B2. Decorator Placement Strategy

**Problem:** Where should the suppression decorators live long-term?

**Options:**
1. **In this package** (current): `@azure-tools/typespec-breaking-change` provides `@approvedBreakingChange` and `@approvedUnversionedChange`. Spec authors must depend on this package.
2. **In `@azure-tools/typespec-azure-core`**: More discoverable, no extra dependency for spec authors already using Azure patterns. But adds coupling.
3. **Structured suppressions**: Move away from decorators entirely. Use a separate structured file (e.g., `tsp-breaking-change-suppressions.yaml`) or structured comments. Decouples suppression from type graph.

**Considerations:**
- Decorators are TypeSpec-native and reviewable inline
- Structured suppressions avoid polluting the spec with tool-specific metadata
- Decorator approach requires the tool package to be a dependency of every spec
- Structured approach requires path-based matching (already partially designed)

**Investigation plan:**
1. Survey how other TypeSpec tools handle per-declaration metadata (linter suppressions, etc.)
2. Prototype a structured suppression format and compare authoring ergonomics
3. Consult with TypeSpec team on recommended patterns
4. Decision point: commit to decorators for v1, evaluate structured for v2

### B3. Source Tracing Algorithm Completeness

**Problem:** Source tracing works for common patterns but has gaps. Need a unified, principled algorithm with guaranteed fallbacks.

**Current state:**
- `resolveOrigin()` follows `sourceProperty` chains for spreads/intersections
- `resolveHeadSourceLocations()` looks up types via AST node parent ID
- `resolveFindingLocation()` uses fallback chain: headSourceLocation > origin > base
- ~56% origin resolution on large specs (Network)

**Desired algorithm (unified for both source links and suppression lookup):**
1. Look for the source type in user code (the actual declaration in the .tsp file)
2. If not found, walk up the identity parent chain (property → model → namespace) and find the nearest ancestor in user code
3. If still not found, use the offending operation as fallback
4. Last resort: service namespace

**Investigation plan:**
1. Audit all finding types and document which currently have source tracing gaps
2. Implement the unified algorithm with explicit fallback levels
3. Add a `sourceTraceLevel` field to findings (direct, ancestor, operation, namespace) for debuggability
4. Target: 100% source tracing on representative ARM specs (AppConfiguration, Fleet, Network)
5. Ensure both head and base source locations are resolved (head for "where to fix", base for "what changed")

### B4. Narrowing/Widening Classification and Non-Error Findings

**Problem:** The policy engine classifies some findings as "ignore" (e.g., request widening, response narrowing). These should:
- NOT appear in breaking change reports (they're not errors)
- DO appear in detailed/debug logs for transparency
- Be validated that classification is correct

**Current state:** Reporter filters on `severity === "error"` for the main report. But there's no detailed log output showing what was analyzed and classified as non-breaking.

**Investigation plan:**
1. Verify all "ignore" classifications are correct (request widening, response narrowing)
2. Add a `--verbose` or `--log-level debug` CLI flag that shows all findings including ignored ones
3. Ensure JSON output includes all findings with their severity for downstream tooling
4. Add integration tests that verify specific changes produce "ignore" (not just absence of error)

### B5. Catastrophic Breaking Changes

**Problem:** The tool handles property-level changes well but needs explicit validation for "catastrophic" changes: removing entire operations, removing whole types, removing all properties.

**Current state:** `OperationRemoved` exists as a DiffKind, but testing is minimal. Large-scale removals (entire interface, multiple operations) aren't explicitly tested.

**Investigation plan:**
1. Add tests for: operation removed, all operations in interface removed, model entirely removed, enum entirely removed
2. Verify report output is clear and actionable for catastrophic changes
3. Consider whether catastrophic changes get special prominence in reports (e.g., "⛔ Critical" vs "❌ Error")
4. Test suppression for catastrophic changes (ancestor placement on namespace/interface with path)

### B6. Wildcard and Blanket Suppressions

**Problem:** Should we allow:
- Wildcard paths (e.g., `path: "properties.*"`) for bulk suppressions?
- Blanket suppressions (suppress all findings on a type, or all findings of a kind)?
- Kind-only suppressions without path (suppress all `ResourcePropertyRemoved` on a model)?

**Current decision:** Exact-match only for v1 (Section 7.3 of design overview).

**Considerations:**
- Wide suppressions are convenient but reduce review precision
- A "blanket suppress all" could hide unintentional breaks
- Kind-only (no path) is already partially supported for direct placement

**Investigation plan:**
1. Validate that kind-only suppression (no path, decorator on model) correctly suppresses all findings of that kind on the model
2. Consider flagging "wide" suppressions (kind-only on a model with many properties) in a separate report section
3. Defer wildcard paths to post-v1 unless ergonomic feedback is strong
4. Add a `--strict-suppressions` mode that rejects kind-only suppressions and requires explicit path

### B7. Phase A Optimization Validation

**Problem:** If Phase A detects NO diffs for a version, that version doesn't need Phase B checking (it's unchanged from base). Currently, the code only feeds *changed* versions + *new* versions into Phase B. Validate this is correct and complete.

**Current state:** `orchestrator.ts` builds `candidates = [...changedVersions, ...newVersions]` — this already implements the optimization.

**Investigation plan:**
1. Add explicit test: unchanged version NOT included in Phase B candidates
2. Add explicit test: changed version IS included
3. Add explicit test: new version IS included
4. Document the optimization in the design overview

### B8. Output Format Documentation

**Problem:** The JSON and Markdown output formats need formal documentation for the specs team and CI integration authors.

**Investigation plan:**
1. Create `docs/output-formats.md` with JSON schema for the structured output
2. Document Markdown format with annotated examples
3. Document CI integration contract (exit codes, output paths, environment variables)
4. Share with specs team for review

### B9. ARM Template Type Parameter Tracing

**Problem:** Origin resolution achieves only ~56% on the Network spec and ~70% on AppConfiguration. The gap is primarily in properties flowing through ARM template type parameters (`TrackedResource<T>`, `StandardResourceOperations`). When a property enters a template boundary, the `sourceProperty` chain does not extend through to the template argument.

**Current state:** `traceToCanonicalProperty()` handles visibility-filtered copies (e.g., `EmployeePropertiesCreateOrUpdate`) via AST node identity. But properties that flow through ARM resource template patterns (the `T` in `TrackedResource<T>`) are not traced back to the original type parameter.

**Investigation plan:**
1. Investigate `templateMapper` / `templateArguments` on the compiler's type graph
2. Determine if the compiler preserves a link from template-expanded properties to the original `T`
3. If yes, extend `resolveOrigin()` to follow template argument chains
4. If no, evaluate whether the TypeSpec compiler could be extended to preserve this link
5. Target: 90%+ origin resolution on representative ARM specs

### B10. Linter Rule Integration and IDE Feedback

**Problem:** The tool currently runs only as a CLI. TypeSpec supports linter rules via `createRule()` that provide real-time IDE feedback during spec authoring. Should the tool also surface findings as linter diagnostics?

**Options:**
1. **CLI only** (current): Findings appear only in CI. Authors don't see issues until PR.
2. **CLI + linter rule**: Cross-version rules run in the IDE as the author types. Requires the tool to be a library dependency.
3. **CLI + Language Server Protocol**: More complex but could provide richer IDE integration.

**Investigation plan:**
1. Prototype a single rule (e.g., `OperationRemoved`) as a `createRule()` linter rule
2. Evaluate whether version mutators + comparison can run fast enough for IDE latency (<1s)
3. Determine which rules make sense in real-time vs batch-only
4. Decision: which surface(s) to support for v1

### B11. Adding APIs to Azure Core

**Problem:** Some functionality in this tool could benefit the broader TypeSpec ecosystem if upstreamed to `@azure-tools/typespec-azure-core` or `@typespec/http`:

- **Operation identity** (`{method, normalizedPath}`) — useful for any tool that needs stable operation references
- **Version enumeration and pair construction** — useful for any version-aware analysis
- **Canonical HTTP comparison utilities** — useful for any HTTP contract analysis tool
- **Suppression decorator infrastructure** — could be generalized for any TypeSpec tool that needs per-declaration suppressions

**Investigation plan:**
1. Identify which APIs are generic enough to upstream vs tool-specific
2. Propose API surfaces to the TypeSpec/Azure core team
3. Evaluate impact on this tool if dependencies move upstream
4. Consider whether suppression decorators belong in core (see B2)

### B12. Git-Revision-Based Analysis

**Problem:** The CLI currently requires explicit `--base <path>` and `--head <path>` pointing to directories. Production CI needs `--base origin/main` or `--base <commitish>` to automatically check out and compile the base revision.

**Current state:** The demo workflow uses git worktrees to create base directories manually. This works but is not ergonomic for CI.

**Investigation plan:**
1. Add `--base <commitish>` support: tool checks out the base revision to a temp directory
2. Handle sparse checkout (only the relevant spec folder)
3. Consider caching compiled base programs to avoid recompilation on every PR
4. Evaluate integration with GitHub Actions' checkout action

### B13. Multi-Service Spec Validation

**Problem:** The tool supports multiple `@service` namespaces in a single program, but this path hasn't been validated against real multi-service specs.

**Investigation plan:**
1. Find real multi-service specs in azure-rest-api-specs (if any exist)
2. Create synthetic multi-service fixtures if none exist
3. Validate each service is analyzed independently with correct findings
4. Verify report output attributes findings to correct service

### B14. Suppression by Version Range

**Problem:** Current `since:` scoping ties a suppression to a single introducing version. Production may need version range support (e.g., "suppress for all versions >= 2024-06-01 and < 2025-01-01") for temporary breaking changes that are later reverted.

**Investigation plan:**
1. Evaluate frequency of this pattern in real specs
2. Design `since`/`until` range semantics
3. Consider interaction with stale approval detection
4. Defer to post-v1 unless real-world demand is demonstrated

---

## Part C: Prioritized Work Items

### Phase 1: Core Correctness (1-2 weeks)

These items fix known gaps that would cause incorrect behavior in production.

| # | Item | Relates To | Effort |
|---|------|-----------|--------|
| 1.1 | Implement new-vs-existing suppression comparison | B1 | 3 days |
| 1.2 | Unified source tracing algorithm with fallbacks | B3 | 2 days |
| 1.3 | ARM template type parameter tracing (higher origin%) | B9 | 2 days |
| 1.4 | Catastrophic change detection tests | B5 | 1 day |
| 1.5 | Narrowing/widening classification audit | B4 | 1 day |
| 1.6 | Validate `path` and `since` narrowing | B6 | 0.5 day |
| 1.7 | Phase A optimization validation tests | B7 | 0.5 day |
| 1.8 | Phase A with real base/head programs (beyond demo PRs) | B3 | 1 day |

### Phase 2: Debuggability and Logging (1 week)

| # | Item | Relates To | Effort |
|---|------|-----------|--------|
| 2.1 | Structured debug logging (analysis decisions, skipped items) | B4 | 2 days |
| 2.2 | Split log levels: standard (CI output) vs debug (diagnostics) | B4 | 1 day |
| 2.3 | Verbose mode showing all findings including "ignore" | B4 | 1 day |
| 2.4 | Integration with GitHub Actions debug logging | B4 | 0.5 day |

### Phase 3: Test Coverage Push (1-2 weeks)

See `typespec-breaking-change-test-coverage.md` for detailed scenario list.

| # | Item | Effort |
|---|------|--------|
| 3.1 | Cross-compilation suppression completeness (P1) | 0.5 day |
| 3.2 | Suppression display & hints (P2) | 0.5 day |
| 3.3 | Source link resolution (P3) | 0.5 day |
| 3.4 | Resource merge edge cases (P4) | 0.5 day |
| 3.5 | Reporter & summary messages (P5) | 0.5 day |
| 3.6 | Diff engine edge cases (P6) | 0.5 day |
| 3.7 | Mixed Phase A+B scenarios (P7) | 0.5 day |
| 3.8 | E2E scenarios (25 scenarios) | 1.5 days |
| 3.9 | Large-spec source tracing validation (100% on AppConfiguration, Fleet) | 1 day |
| 3.10 | Mixed new + existing suppression scenarios | 1 day |

### Phase 4: Documentation and Output (1 week)

| # | Item | Relates To | Effort |
|---|------|-----------|--------|
| 4.1 | Output format documentation (JSON schema, Markdown spec) | B8 | 2 days |
| 4.2 | Code documentation (TSDoc for all public APIs) | — | 2 days |
| 4.3 | CI integration guide (for specs repo team) | B8 | 1 day |
| 4.4 | Decorator placement decision memo | B2 | 1 day |
| 4.5 | API upstream evaluation memo (what belongs in core) | B11 | 1 day |

### Phase 5: Production Hardening (2 weeks)

| # | Item | Relates To | Effort |
|---|------|-----------|--------|
| 5.1 | Real-spec validation: 5+ ARM specs, 3+ data-plane specs | — | 3 days |
| 5.2 | Complex pattern testing (polymorphism, discriminators, envelopes) | — | 2 days |
| 5.3 | Multi-service spec validation | B13 | 1 day |
| 5.4 | Wide suppression flagging in reports | B6 | 1 day |
| 5.5 | Stale suppression detection and codefix | — | 2 days |
| 5.6 | Version scoping (`since:`) implementation | — | 2 days |
| 5.7 | Git-revision-based analysis (`--base <commitish>`) | B12 | 2 days |
| 5.8 | Linter rule integration prototype | B10 | 2 days |

### Phase 6: OAD Parity and Side-by-Side (3-4 weeks)

See `typespec-breaking-change-validation-strategy.md` for full details.

| # | Item | Effort |
|---|------|--------|
| 6.1 | OAD rule correlation test conversion (Phase 1 of validation strategy) | 1 week |
| 6.2 | Merged PR historical analysis (Phase 3) | 1 week |
| 6.3 | Shadow-mode CI integration (Phase 4) | 1 week |
| 6.4 | Agreement rate dashboard | 0.5 week |

### Phase 7: Graduation (1-2 weeks)

| # | Item | Effort |
|---|------|--------|
| 7.1 | Soft gate (labels, no merge block) | 3 days |
| 7.2 | Full gate (merge block) | 2 days |
| 7.3 | OAD sunset plan | 2 days |

---

## Part D: Decision Log

Decisions to be made during execution. Record outcomes here.

| Decision | Options | Status | Outcome |
|----------|---------|--------|---------|
| Decorator placement | This package / azure-core / structured file | **Open** | — |
| Structured vs decorator suppressions | Decorators / structured file / custom suppressions / hybrid | **Open** | — |
| APIs to upstream to core | Operation identity / version utils / suppression infra / none | **Open** | — |
| Wildcard suppressions | Exact only / glob / regex | **Deferred** to post-v1 | — |
| Blanket suppress-all | Allow / disallow / flag | **Open** | — |
| Scalar transition table scope | Full / progressive | **Open** | — |
| Source trace target | 100% on N specs / best-effort | **Open** | — |
| Report structure for wide suppressions | Same section / separate warning / flag | **Open** | — |
| New-vs-existing threshold | Compare decorators / compare findings | **Open** | — |
| Linter rule integration | CLI only / CLI + linter / CLI + LSP | **Open** | — |
| Git revision support | Path only / commitish / sparse checkout | **Open** | — |
| Version range suppression | Single `since` / `since`+`until` range | **Deferred** to post-v1 | — |

---

## Part E: Dependencies and Risks

| Risk | Mitigation |
|------|-----------|
| `@typespec/http-canonicalization` API changes | Pin version, monitor upstream |
| TypeSpec compiler version changes breaking state map behavior | Integration tests on latest nightly |
| Large spec performance regression | Benchmark tests with regression gates |
| Suppression ergonomics rejected by spec authors | Early feedback loop with 2-3 spec teams |
| OAD parity gaps discovered late | Start OAD conversion early (Phase 6.1) in parallel with Phase 3 |

---

## Appendix: Relationship to Existing Documents

| Document | Scope | Status |
|----------|-------|--------|
| `rfcs/breaking-changes/typespec-breaking-change-design-overview.md` | Architecture, rules, suppression design, implementation | Updated 2026-08-04 |
| `rfcs/breaking-changes/typespec-breaking-change-validation-strategy.md` | Multi-phase validation (OAD parity → gating) | Current |
| `rfcs/breaking-changes/typespec-breaking-change-test-coverage.md` | Unit/integration test scenarios | Updated 2026-08-04 |
| `PROTOTYPE-EVALUATION.md` | Prototype Q&A with benchmarks, open questions P1-P5 | Current |
| `docs/prototype-dev-guide.md` | Deployment runbook, pitfalls, environment | Created 2026-08-04 |
| `docs/violations-reference.md` | DiffKind reference for spec authors | Current |
| `docs/presentation-notes.md` | Slide deck talking points | Current |
| This document | Comprehensive next-steps plan | Active |

### Items Integrated from Other Documents

The following items from existing documents have been integrated into this plan:

| Source | Item | Integrated As |
|--------|------|---------------|
| `PROTOTYPE-EVALUATION.md` P1 | ARM template type parameter tracing | B9, Phase 1.3 |
| `PROTOTYPE-EVALUATION.md` P2 | Linter rule integration | B10, Phase 5.8 |
| `PROTOTYPE-EVALUATION.md` P3 | Multi-service specs | B13, Phase 5.3 |
| `PROTOTYPE-EVALUATION.md` P4 | Suppression by version range | B14 (deferred) |
| `PROTOTYPE-EVALUATION.md` P5 | Phase A with real base/head | Phase 1.8 |
| `presentation-notes.md` | Git-revision-based analysis | B12, Phase 5.7 |
| `source-tracing-analysis.md` | AST node identity for dedup | A4 (resolved) |
| User observations (2026-08-04) | New vs existing suppressions | B1, Phase 1.1 |
| User observations (2026-08-04) | Decorator placement / structured suppressions | B2 |
| User observations (2026-08-04) | Source tracing unified algorithm | B3, Phase 1.2 |
| User observations (2026-08-04) | Narrowing/widening classification | B4, Phase 1.5 |
| User observations (2026-08-04) | Catastrophic breaking changes | B5, Phase 1.4 |
| User observations (2026-08-04) | Wildcard/blanket suppressions | B6 |
| User observations (2026-08-04) | Debuggability / logging levels | Phase 2 |
| User observations (2026-08-04) | Large-spec testing | Phase 3.9, Phase 5.1 |
| User observations (2026-08-04) | Output format documentation | B8, Phase 4 |
| User observations (2026-08-04) | Code documentation | Phase 4.2 |
| User observations (2026-08-04) | APIs to upstream to core | B11, Phase 4.5 |
