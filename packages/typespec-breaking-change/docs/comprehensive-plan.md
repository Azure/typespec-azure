# Comprehensive Plan: Next Steps for @azure-tools/typespec-breaking-change

**Created:** 2026-08-04
**Status:** Active planning document

## Executive Summary

The prototype is functional with 364 tests, real-world performance validation, and 4 demo PRs.
This document captures the path from prototype to production-ready tool, organized as:
(A) resolved questions (design settled, implementation may remain), (B) genuinely open questions, (C) prioritized work items.

---

## Part A: Resolved Questions

These are answered by design documents, prototype evidence, or both. Items marked "NOT YET IMPLEMENTED" have resolved designs but need code.

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

**Answer:** Changed versions in Phase A feed into Phase B candidates. Only new or changed versions are checked for cross-version breaking changes. Already implemented and documented in design overview §8.5.
**Evidence:** `orchestrator.ts` lines 157-171, design overview §8.5.
**Residual:** Add explicit unit tests for: unchanged version excluded, changed version included, new version included.

### A7. TypeSpec Library Registration ✅

**Answer:** Requires `exports` in package.json + `using Azure.BreakingChange;` in consumer specs.
**Evidence:** Documented in `docs/prototype-dev-guide.md`, verified by PR #5.

### A8. Suppression Mechanism: Decorators ✅

**Answer:** The design resolves this as custom decorators (`@approvedBreakingChange`, `@approvedUnversionedChange`). The entire suppression system (design overview §6, 500+ lines) is built on the decorator model with direct/parent placement, `path:` targeting, `since:` version scoping, stale approval detection, and new/existing suppression comparison.
**Evidence:** Design overview §6.1-6.6, implemented in `src/decorators.ts`, `src/suppression.ts`, `lib/decorators.tsp`.
**Residual open question:** Which package hosts the decorators? See B1.

### A9. New vs Existing Suppression Classification ✅ (NOT YET IMPLEMENTED)

**Answer:** Design overview §6.3 fully specifies the classification:
- **NEW:** base has no matching suppression; head does → requires reviewer sign-off
- **EXISTING:** base and head have the same suppression → no new review
- **REMOVED:** base had it; head removed it → cleanup or will produce unsuppressed finding
- **MODIFIED:** both have it but metadata differs → re-review

Identity matching uses declaration identity for direct placement, ancestor identity + `path` for parent placement. Metadata comparison includes kind, path, since, reason. PR labels (`BreakingChangeReviewRequired`, `VersioningReviewRequired`) are applied for new/modified instances.
**Evidence:** Design overview §6.3, lines 612-671.
**Implementation status:** NOT YET IMPLEMENTED. Prototype treats all suppressed findings as "new". Phase 1 item (1.1).

### A10. Version Scoping with `since:` ✅ (NOT YET IMPLEMENTED)

**Answer:** Design overview §6.6 fully resolves this, including the "temporary revert" scenario:
- Unscoped approval valid when it matches exactly one distinct stable baseline
- If same `(DiffKind, identity-path)` fires against multiple baselines, version-scoped approvals are required
- Resolved via repeated point-in-time `since:`-scoped approvals (one per transition), not `since`/`until` ranges
- Ambiguity detection: when an unscoped approval matches multiple baselines, the later finding is reported as unsuppressed until the approval is split into `since:`-scoped versions

**Evidence:** Design overview §6.6, lines 862-917, with worked example (legacyStatus removed → re-added → removed again, resolved with two `since:`-scoped decorators).
**Implementation status:** NOT YET IMPLEMENTED. Phase 5 item (5.6). Note: ambiguity detection (multi-baseline matching) is non-trivial implementation work.

### A11. Narrowing/Widening Classification ✅

**Answer:** Design overview §5 fully specifies the directional classification:
- Request narrowing → Error; Response widening → Error
- Request widening → Ignore; Response narrowing → Ignore
- Format changes → Error regardless of direction
- Per-type rules: Scalars (format restrictiveness), Enums (closed sets), Unions (open/closed), Arrays/Records (recursive item/value type), Models (recursive per-property)

**Evidence:** Design overview §5, lines 285-302.
**Residual gaps:** (a) Test coverage verifying implementation matches this spec; (b) Debug/verbose logging to surface "ignore" findings for transparency. See Phase 2.

### A12. Stale Approval Detection ✅ (NOT YET IMPLEMENTED)

**Answer:** Design overview §6.5 fully specifies:
- Approvals that don't match any current finding → reported as diagnostics (not blockers)
- Tool provides a codefix to remove stale approvals
- Lifecycle: active → spec evolves → finding disappears → diagnostic → author removes via codefix

**Evidence:** Design overview §6.5, lines 834-861.
**Implementation status:** NOT YET IMPLEMENTED. Phase 5 item (5.5).

### A13. Catastrophic Change Handling ✅

**Answer:** `OperationRemoved` is a defined DiffKind (design overview §5, Operation-Level Rules). Suppression for removed operations uses parent placement on the containing interface/namespace with `path:` set to the wire identity (e.g., `DELETE /subscriptions/{}/resourceGroups/{}/providers/...`).
**Evidence:** Design overview §6.2, lines 505-524 (worked example with removed operation on interface).
**Residual:** Testing is minimal — need to add tests for whole-operation removal, interface removal, and model removal. Phase 1 item (1.4).

---

## Part B: Open Questions

These have NO resolved design and genuinely need investigation or decisions.

### B1. Decorator Hosting Package

**Problem:** The suppression decorators are currently in `@azure-tools/typespec-breaking-change`. Should they move to `@azure-tools/typespec-azure-core`?

**Tradeoffs:**
- **This package** (current): Clean separation of concerns. Spec authors must add an explicit dependency.
- **`@azure-tools/typespec-azure-core`**: Spec authors already depend on it — no extra dependency. But couples core to this tool's release cycle and concerns.

**Action:** Consult with TypeSpec team. Decision needed before v1 GA.

### B2. Source Tracing Completeness and Unification

**Problem:** Source tracing works for common patterns but needs to be extended and unified. The existing fallback chain (design overview §8.2: headSourceLocation > origin > baseSourceLocation) handles most cases, but:
- Origin resolution achieves only ~56% on Network, ~70% on AppConfiguration (PROTOTYPE-EVALUATION.md Q3/N1)
- The gap is primarily ARM template type parameters (`TrackedResource<T>`) — `sourceProperty` chain doesn't extend through template boundaries (see also B5)
- Source tracing for *source links* and *suppression identity lookup* use different code paths that should be unified

**Desired extension of existing §8.2 algorithm:**
1. Existing: look for source type in user code via `sourceProperty` chain
2. **New:** if not found, use `templateMapper`/`templateArguments` to trace through template boundaries
3. Existing: walk up identity parent chain (property → model → namespace)
4. **New:** add explicit `sourceTraceLevel` field for debuggability (direct, ancestor, operation, namespace)
5. Ensure both head and base source locations are resolved (head for "where to fix", base for "what changed")

**Evidence:** Design overview §8.2 (existing fallback principle), PROTOTYPE-EVALUATION.md Q3/N1 (coverage gaps).

### B3. Wildcard and Blanket Suppressions

**Problem:** Should we allow:
- Wildcard paths (e.g., `path: "properties.*"`) for bulk suppressions?
- Blanket suppressions (suppress all findings on a type, or all findings of a kind)?
- Kind-only suppressions without path (suppress all `ResourcePropertyRemoved` on a model)?

**Current decision:** Exact-match only for v1 (design overview §7.3).

**Considerations:**
- Wide suppressions are convenient but reduce review precision
- A "blanket suppress all" could hide unintentional breaks
- Kind-only (no path) is already partially supported for direct placement
- Consider flagging "wide" suppressions in a separate report section

**Action:** Defer wildcard paths to post-v1. Validate kind-only behavior. Evaluate report flagging for wide suppressions.

### B4. Output Format Documentation

**Problem:** The JSON and Markdown output formats need formal documentation for the specs team and CI integration authors. Design overview §6.4 provides example markdown snippets but no formal schema.

**Action:**
1. Create `docs/output-formats.md` with JSON schema for structured output
2. Document Markdown format with annotated examples
3. Document CI integration contract (exit codes, output paths, environment variables)
4. Share with specs team for review

### B5. ARM Template Type Parameter Tracing

**Problem:** Origin resolution gap on properties flowing through ARM template type parameters (`TrackedResource<T>`, `StandardResourceOperations`). Separate from the general source tracing question (B2) because it requires specific investigation of the TypeSpec compiler's template machinery.

**Investigation plan:**
1. Investigate `templateMapper` / `templateArguments` on the compiler's type graph
2. Determine if the compiler preserves a link from template-expanded properties to the original `T`
3. If yes, extend `resolveOrigin()` to follow template argument chains
4. If no, evaluate whether the TypeSpec compiler could be extended to preserve this link
5. Target: 90%+ origin resolution on representative ARM specs

**Evidence:** PROTOTYPE-EVALUATION.md P1, N1.

### B6. Linter Rule Integration and IDE Feedback

**Problem:** The tool currently runs only as a CLI. TypeSpec supports linter rules via `createRule()` that provide real-time IDE feedback during spec authoring.

**Options:**
1. **CLI only** (current): Findings appear only in CI. Authors don't see issues until PR.
2. **CLI + linter rule**: Cross-version rules run in the IDE as the author types.
3. **CLI + Language Server Protocol**: More complex but richer IDE integration.

**Investigation plan:**
1. Prototype a single rule as a `createRule()` linter rule
2. Evaluate whether version mutators + comparison can run fast enough for IDE latency (<1s)
3. Determine which rules make sense in real-time vs batch-only

**Evidence:** PROTOTYPE-EVALUATION.md P2.

### B7. Adding APIs to Azure Core

**Problem:** Some functionality could benefit the broader TypeSpec ecosystem if upstreamed:
- Operation identity (`{method, normalizedPath}`)
- Version enumeration and pair construction
- Canonical HTTP comparison utilities
- Suppression decorator infrastructure (related to B1 hosting question)

**Action:**
1. Identify which APIs are generic enough to upstream vs tool-specific
2. Propose API surfaces to the TypeSpec/Azure core team
3. Evaluate impact on this tool if dependencies move upstream

### B8. Git-Revision-Based Analysis

**Problem:** The CLI requires explicit `--base <path>` and `--head <path>` pointing to directories. Production CI needs `--base <commitish>` to automatically check out and compile the base revision.

**Action:**
1. Add `--base <commitish>` support: tool checks out the base revision to a temp directory
2. Handle sparse checkout (only the relevant spec folder)
3. Consider caching compiled base programs
4. Evaluate integration with GitHub Actions' checkout action

**Evidence:** PROTOTYPE-EVALUATION.md Q9, `presentation-notes.md`.

### B9. Multi-Service Spec Validation

**Problem:** The tool supports multiple `@service` namespaces but this hasn't been validated against real multi-service specs.

**Action:**
1. Find real multi-service specs in azure-rest-api-specs (if any exist)
2. Create synthetic multi-service fixtures if none
3. Validate each service analyzed independently
4. Verify report attributes findings to correct service

**Evidence:** PROTOTYPE-EVALUATION.md P3.

### B10. Scalar Transition Table Scope

**Problem:** Should v1 implement the full scalar transition table (distinguishing widening from format changes) or flag all type changes uniformly? (Design overview §7.2.)

**Tradeoffs:** Full table provides better DX but larger correctness surface. Narrower first release may be safer if the team cannot validate every scalar family adequately.

**Action:** Evaluate which scalar families are adequately validated by current tests. Decide: full table or progressive.

---

## Part C: Prioritized Work Items

### Phase 1: Core Correctness (1-2 weeks)

Implement resolved designs and validate known gaps.

| # | Item | Design Ref | Effort |
|---|------|-----------|--------|
| 1.1 | Implement new-vs-existing suppression comparison | §6.3 (A9) | 3 days |
| 1.2 | Extend source tracing with unified fallbacks | §8.2 (B2) | 2 days |
| 1.3 | ARM template type parameter tracing (higher origin%) | B5 | 2 days |
| 1.4 | Catastrophic change detection tests | §6.2 (A13) | 1 day |
| 1.5 | Verify narrowing/widening implementation matches §5 | §5 (A11) | 1 day |
| 1.6 | Validate `path` and `since` narrowing | §6.6, §7.3 | 0.5 day |
| 1.7 | Phase A optimization validation tests | §8.5 (A6) | 0.5 day |
| 1.8 | Phase A with real base/head programs (beyond demo PRs) | — | 1 day |

### Phase 2: Debuggability and Logging (1 week)

| # | Item | Design Ref | Effort |
|---|------|-----------|--------|
| 2.1 | Structured debug logging (analysis decisions, skipped items) | A11 | 2 days |
| 2.2 | Split log levels: standard (CI output) vs debug (diagnostics) | — | 1 day |
| 2.3 | Verbose mode showing all findings including "ignore" | A11 | 1 day |
| 2.4 | Integration with GitHub Actions debug logging | — | 0.5 day |

### Phase 3: Test Coverage Push (1-2 weeks)

See `typespec-breaking-change-test-coverage.md` for detailed scenario list.

| # | Item | Effort |
|---|------|--------|
| 3.1 | Cross-compilation suppression completeness | 0.5 day |
| 3.2 | Suppression display & hints | 0.5 day |
| 3.3 | Source link resolution | 0.5 day |
| 3.4 | Resource merge edge cases | 0.5 day |
| 3.5 | Reporter & summary messages | 0.5 day |
| 3.6 | Diff engine edge cases | 0.5 day |
| 3.7 | Mixed Phase A+B scenarios | 0.5 day |
| 3.8 | E2E scenarios (25 scenarios) | 1.5 days |
| 3.9 | Large-spec source tracing validation (100% on AppConfiguration, Fleet) | 1 day |
| 3.10 | Mixed new + existing suppression scenarios | 1 day |

### Phase 4: Documentation and Output (1 week)

| # | Item | Relates To | Effort |
|---|------|-----------|--------|
| 4.1 | Output format documentation (JSON schema, Markdown spec) | B4 | 2 days |
| 4.2 | Code documentation (TSDoc for all public APIs) | — | 2 days |
| 4.3 | CI integration guide (for specs repo team) | B4 | 1 day |
| 4.4 | Decorator hosting evaluation memo | B1 | 1 day |
| 4.5 | API upstream evaluation memo (what belongs in core) | B7 | 1 day |

### Phase 5: Production Hardening (2 weeks)

| # | Item | Design Ref | Effort |
|---|------|-----------|--------|
| 5.1 | Real-spec validation: 5+ ARM specs, 3+ data-plane specs | — | 3 days |
| 5.2 | Complex pattern testing (polymorphism, discriminators, envelopes) | — | 2 days |
| 5.3 | Multi-service spec validation | B9 | 1 day |
| 5.4 | Wide suppression flagging in reports | B3 | 1 day |
| 5.5 | Stale suppression detection and codefix | §6.5 (A12) | 2 days |
| 5.6 | Version scoping (`since:`) + ambiguity detection | §6.6 (A10) | 2 days |
| 5.7 | Git-revision-based analysis (`--base <commitish>`) | B8 | 2 days |
| 5.8 | Linter rule integration prototype | B6 | 2 days |

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

| Decision | Options | Status | Outcome |
|----------|---------|--------|---------|
| Suppression mechanism | Custom decorators | **Resolved** (§6) | Decorators with direct/parent placement, `path:`, `since:` |
| Decorator hosting | This package / azure-core | **Open** | — |
| New-vs-existing classification | Compare decorators by identity + metadata | **Resolved** (§6.3) | NEW/EXISTING/REMOVED/MODIFIED per §6.3 |
| Version scoping | Point-in-time `since:` + ambiguity detection | **Resolved** (§6.6) | Multiple `since:`-scoped decorators for oscillating changes |
| Stale approval handling | Diagnostic + codefix | **Resolved** (§6.5) | Non-blocking diagnostic, codefix to remove |
| Narrowing/widening rules | Directional classification table | **Resolved** (§5) | Request narrowing/response widening = Error |
| Wildcard suppressions | Exact only / glob / regex | **Deferred** to post-v1 (§7.3) | Exact match for v1 |
| Blanket suppress-all | Allow / disallow / flag | **Open** | — |
| Wide suppression reporting | Same section / separate warning / flag | **Open** | — |
| Scalar transition table scope | Full table / flag uniformly / progressive | **Open** (§7.2) | — |
| Source trace target | 100% on N specs / best-effort with fallbacks | **Open** | — |
| APIs to upstream to core | Operation identity / version utils / none | **Open** | — |
| Linter rule integration | CLI only / CLI + linter / CLI + LSP | **Open** | — |
| Git revision support | Path only / commitish / sparse checkout | **Open** | — |

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

| Source | Item | Integrated As |
|--------|------|---------------|
| Design overview §6.3 | New/existing suppression comparison | A9 (resolved), Phase 1.1 |
| Design overview §6.5 | Stale approval detection | A12 (resolved), Phase 5.5 |
| Design overview §6.6 | Version scoping with `since:` | A10 (resolved), Phase 5.6 |
| Design overview §5 | Narrowing/widening classification | A11 (resolved), Phase 1.5 |
| Design overview §6.2 | Removed operation suppression | A13 (resolved), Phase 1.4 |
| Design overview §7.2 | Scalar transition table scope | B10 (open) |
| Design overview §7.3 | Wildcard suppression paths | B3 (deferred to post-v1) |
| `PROTOTYPE-EVALUATION.md` P1 | ARM template type parameter tracing | B5, Phase 1.3 |
| `PROTOTYPE-EVALUATION.md` P2 | Linter rule integration | B6, Phase 5.8 |
| `PROTOTYPE-EVALUATION.md` P3 | Multi-service specs | B9, Phase 5.3 |
| `PROTOTYPE-EVALUATION.md` P5 | Phase A with real base/head | Phase 1.8 |
| `presentation-notes.md` | Git-revision-based analysis | B8, Phase 5.7 |
| `source-tracing-analysis.md` | AST node identity for dedup | A4 (resolved) |
| User observations (2026-08-04) | New vs existing suppressions | A9, Phase 1.1 |
| User observations (2026-08-04) | Decorator hosting question | B1 |
| User observations (2026-08-04) | Source tracing unified algorithm | B2, Phase 1.2 |
| User observations (2026-08-04) | Catastrophic breaking changes | A13, Phase 1.4 |
| User observations (2026-08-04) | Wildcard/blanket suppressions | B3 |
| User observations (2026-08-04) | Debuggability / logging levels | Phase 2 |
| User observations (2026-08-04) | Large-spec testing | Phase 3.9, Phase 5.1 |
| User observations (2026-08-04) | Output format documentation | B4, Phase 4 |
| User observations (2026-08-04) | Code documentation | Phase 4.2 |
| User observations (2026-08-04) | APIs to upstream to core | B7, Phase 4.5 |
