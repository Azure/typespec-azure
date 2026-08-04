# TypeSpec Breaking Change Tool — Test Coverage Report

**Last updated:** 2026-08-04
**Test count:** 364 tests across 19 files
**Coverage:** ~92% statements, ~83% branch, ~93% lines

## 1. Current Test Files

| File | Tests | Focus |
|------|-------|-------|
| `diff-engine.test.ts` | ~80 | Structural graph walking: operations, parameters, bodies, responses |
| `orchestrator.test.ts` | ~45 | Full pipeline: Phase A/B pair selection, dedup, merge, collapse, suppress |
| `suppression-identity.test.ts` | ~30 | Cross-compilation identity matching, state map lookup |
| `origin-dedup.test.ts` | ~25 | `deduplicateBySourceType` — same source model in multiple operations |
| `resolve-location.test.ts` | ~25 | Source link resolution, head program lookup, node parent ID |
| `cli.test.ts` | ~20 | CLI argument parsing and mode selection |
| `suppression.test.ts` | ~20 | `applySuppressions`, `matchesKind`, phase-specific filtering |
| `reporter.test.ts` | ~20 | Markdown/console/JSON output formatting |
| `versions.test.ts` | ~15 | Version enumeration, pair construction, stable classification |
| `codefixes.test.ts` | ~15 | Auto-generated suppression decorator codefixes |
| `decorators.test.ts` | ~12 | Decorator validation, kind acceptance, path field |
| `suppression-guidance.test.ts` | ~12 | Diff-format suppression hints |
| `policy.test.ts` | ~12 | Phase A/B classification policy |
| `types.test.ts` | ~10 | Type utilities and DiffKind enumeration |
| `integration-real-spec.test.ts` | ~8 | Full compile + analyze on realistic ARM spec |
| `operation-identity.test.ts` | ~8 | Path normalization, method+path identity |
| `scenario-validation.test.ts` | ~6 | End-to-end scenario validation |
| `cli-main.test.ts` | ~4 | CLI entry point |

## 2. Coverage Gaps

### Critical (below 80% branch coverage)

| Module | Stmts | Branch | Issue |
|--------|-------|--------|-------|
| `suppression-guidance.ts` | ~44% | ~49% | `formatSuppressionDiff` and path-based hint logic untested |
| `reporter-markdown.ts` | ~87% | ~63% | Version grouping, no-findings messages, source URL construction |

### Moderate (80–95% branch)

| Module | Stmts | Branch | Issue |
|--------|-------|--------|-------|
| `diff-engine.ts` | ~99% | ~81% | Operation matching heuristic edge cases |
| `diff-types.ts` | ~93% | ~80% | Enum member, union variant, scalar transition edges |
| `resolve-location.ts` | ~83% | ~84% | Enum/union parent fallback paths |
| `decorators.ts` | ~92% | ~71% | Path matching in suppression resolution |

## 3. Scenario Coverage Matrix

### Phase B (Cross-Version) Scenarios

| Scenario | Tested | File |
|----------|--------|------|
| Property removed → `ResourcePropertyRemoved` | ✅ | orchestrator, diff-engine |
| Property type changed → `ResourcePropertyTypeChanged` | ✅ | diff-engine |
| Property made required → `RequestPropertyMadeRequired` | ✅ | diff-engine |
| Property made optional → `ResponsePropertyMadeOptional` | ✅ | diff-engine |
| Operation removed → `OperationRemoved` | ✅ | diff-engine |
| Parameter added (required) → Error | ✅ | diff-engine |
| Enum member removed → `EnumValueRemoved` | ✅ | diff-engine |
| Suppression via `@approvedBreakingChange` | ✅ | suppression, orchestrator |
| Resource merge (Request+Response → Resource) | ✅ | orchestrator (scenario 10-11) |
| Stable baseline selection (skip preview) | ✅ | versions |
| Preview-only → no comparisons | ❌ | — |
| Scalar encoding change | ❌ | — |
| Union variant changes | ❌ | — |
| Content-type changes | ❌ | — |
| Multiple services in one spec | ❌ | — |

### Phase A (Same-Version) Scenarios

| Scenario | Tested | File |
|----------|--------|------|
| Property removed (unversioned) | ✅ | orchestrator |
| Cross-compilation suppression (identity mismatch fallback) | ✅ | suppression-identity |
| Phase A dedup (same change across versions → 1 finding) | ✅ | orchestrator |
| Source link → parent model (type deleted from HEAD) | ✅ | resolve-location |
| Source link → property itself (type exists in HEAD via @added) | ✅ | resolve-location |
| Spread model → node parent ID resolution | ✅ | orchestrator (scenario 12) |
| `@approvedUnversionedChange` with path | ✅ | orchestrator (scenario 11) |
| Phase A + B interaction (changed versions feed Phase B) | ❌ | — |
| Multiple properties removed, partial suppression | ❌ | — |

### Pipeline Ordering Scenarios

| Scenario | Tested | File |
|----------|--------|------|
| Suppress AFTER merge (Resource suppression matches) | ✅ | orchestrator (scenario 11) |
| Request/Response alias matches Resource findings | ✅ | suppression |
| Dedup before merge (shared model → 1 finding per op) | ✅ | origin-dedup |
| Collapse after merge (Phase A multi-version → 1 finding) | ✅ | orchestrator |

### Reporting Scenarios

| Scenario | Tested | File |
|----------|--------|------|
| Markdown table output | ✅ | reporter |
| JSON structured output | ✅ | reporter |
| Console output | ✅ | reporter |
| Grouped version tables (per-pair subheadings) | ❌ | — |
| Suppression diff blocks in report | ❌ | — |
| Source link .base stripping | ❌ | — |
| "No changes" messages (Phase A + B variants) | ❌ | — |

## 4. Priority Test Additions

### Priority 1: Cross-Compilation Suppression Completeness (~5 tests)

These validate the fix for the critical Phase A suppression bug:

1. `@approvedUnversionedChange` with `ResourcePropertyRemoved` kind + path matches Phase A merged finding
2. Request/Response kind in suppression still matches Resource findings (backward compat)
3. Invalid kind → warning diagnostic, suppression not stored
4. Kind matches but path doesn't → not suppressed
5. Kind matches, no path on decorator, finding has path → suppresses (decorator covers all paths)

### Priority 2: Suppression Display & Hints (~7 tests)

`suppression-guidance.ts` at 44% coverage — highest gap:

1. `headSourceLocation` present → diff shows `+ decorator` above `  targetLine`
2. No headSourceLocation, Phase A, origin exists → diff targets parent model with `path`
3. No headSourceLocation, Phase A, no origin → fallback diff
4. Origin model regex not found in source text → synthetic fallback
5. Operation-level fallback
6. `formatSuppressionHint` includes `path` for Phase A removed property
7. `formatSuppressionHint` does NOT include `path` for Phase B findings

### Priority 3: Source Link Resolution (~4 tests)

Validate the principled approach:

1. Phase A removed property (no headType) → link to parent model
2. Phase B removed property (no headType, `@removed`) → link to property itself
3. Property exists in head → link to origin (not parent model)
4. Removed with no parent model → fallback chain

### Priority 4: Resource Merge Edge Cases (~5 tests)

1. Only Request exists (no Response) → stays as Request kind
2. Only Response exists → stays as Response kind
3. Nested property paths merge correctly
4. Three operations touching same model → correct merge
5. Different models (same property name) → no merge

### Priority 5: Reporter & Summary (~9 tests)

1. Single version pair → one subheading
2. Multiple version pairs → separate subheadings
3. Mix of suppressed/unsuppressed across pairs
4. Empty version pair → no subheading
5. Suppression diff collapsible section
6. All preview → "no stable baseline" message
7. Stable exists, no candidates → "no comparisons needed" message
8. No services → "no versioned services found"
9. Single program Phase A → "needs base program"

### Priority 6: Diff Engine Edge Cases (~9 tests)

1. Enum member added (response context → Error)
2. Enum member added (request context → Ignore)
3. Closed union variant removed
4. Open union variant changes (not breaking)
5. Scalar format change (e.g., int32 → string)
6. Array item type change
7. Record value type change
8. TypeKindChanged (Model → Array)
9. Operation route changed

## 5. End-to-End Scenarios

These test the full pipeline from TypeSpec compilation through report generation. Each uses real TypeSpec fixtures compiled via the test host.

| # | Scenario | Phases | Key Validation |
|---|----------|--------|----------------|
| E2E-1 | Property removed, new version | B | ResourcePropertyRemoved, source link to property |
| E2E-2 | Property removed + suppression | B | Finding marked suppressed with reason |
| E2E-3 | Property type changed | B | ResourcePropertyTypeChanged, correct diff |
| E2E-4 | Type changed + suppression | B | Suppression matches |
| E2E-5 | Property removed without versioning | A | Source link to parent, dedup across versions |
| E2E-6 | Unversioned removal + suppression | A | Cross-compilation scan, path match |
| E2E-7 | Wrong kind in suppression | A | NOT suppressed |
| E2E-8 | Wrong path in suppression | A | NOT suppressed |
| E2E-9 | Multiple removals, partial suppression | A | 1 suppressed, 1 not |
| E2E-10 | Same removal across 3 versions | A | Collapsed to 1 finding |
| E2E-11 | Preview-only, no comparisons | B | Correct "no stable baseline" message |
| E2E-12 | Stable last, no new versions | B | "no comparisons needed" message |
| E2E-13 | Stable→preview→stable chain | B | Only stable-to-stable comparison |
| E2E-14 | Phase A + B combined | A+B | Separate findings per phase |
| E2E-15 | Grouped version tables | Report | Per-pair subheadings, diff blocks |
| E2E-16 | Source links .base stripping | Report | Clean URLs |
| E2E-17 | Multiple services | A+B | Independent analysis |
| E2E-18 | Ancestor suppression with path | B | Namespace-level decorator matches |
| E2E-19 | Resource merge shared model | B | Request+Response → single Resource |
| E2E-20 | No changes (clean run) | A+B | Green checkmark message |

## 6. Execution Estimate

| Priority | Tests | Effort | Coverage Impact |
|----------|-------|--------|-----------------|
| P1: Cross-compilation suppression | 5 | 30 min | suppression.ts fully covered |
| P2: Suppression display | 7 | 45 min | suppression-guidance 44% → 95% |
| P3: Source link resolution | 4 | 20 min | resolve-location 84% → 95% |
| P4: Resource merge edges | 5 | 30 min | orchestrator branch +10% |
| P5: Reporter & summary | 9 | 30 min | reporter-markdown 63% → 95% |
| P6: Diff engine edges | 9 | 30 min | diff-types branch 80% → 92% |
| E2E scenarios | 20 | 60 min | Integration confidence |
| **Total** | **~59** | **~4 hours** | **83% → 95% branch** |

## 7. Relationship to Validation Strategy

This document covers **unit and integration test coverage** for the prototype. The broader validation strategy (`typespec-breaking-change-validation-strategy.md`) covers:

- Phase 1: OAD test conversion (parity with swagger-based tools)
- Phase 2: Gap coverage (TypeSpec-specific scenarios)
- Phase 3: Merged PR analysis (real-world validation)
- Phase 4: Side-by-side evaluation (shadow mode in CI)
- Phase 5: Graduated gating (promotion to enforcement)

The tests in this document correspond to early Phase 2 work (internal validation). OAD conversion (Phase 1) and production validation (Phases 3-5) are separate workstreams that build on top of this foundation.
