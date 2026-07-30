# TypeSpec Breaking Change Detection — Presentation Notes

> **Format**: 2–3 slides with talking points. Use these as speaker notes.

---

## Slide 1: What & Why

### Title: TypeSpec Breaking Change Detection for Azure APIs

**Problem Statement**:
- Azure services define APIs using TypeSpec with `@versioned` version annotations
- Breaking changes between api-versions break customer SDKs and automations
- Today: OpenAPI-diff-based checks catch some issues but miss TypeSpec-level context
- Missing: source-accurate feedback, suppression workflow, version-aware analysis

**What we built**:
- `@azure-tools/typespec-breaking-change` — a TypeSpec-native breaking change detector
- Operates on the compiler's type graph (not generated OpenAPI)
- Two-phase analysis: Phase A (same-version stability) + Phase B (cross-version compatibility)
- Integrated suppression via `@approvedBreakingChange` decorator

**Talking Points**:
- Works directly on TypeSpec source → source locations are exact, not reverse-mapped from OpenAPI
- Request/response direction determines severity (removing a request property = error; adding optional = safe)
- Deduplication via origin resolution: a shared model change is reported once, not per-operation
- Performance: 8.4s for 13-version spec, 7s for 739-operation spec — well within CI budget

---

## Slide 2: Architecture & How It Works

### Title: Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    TypeSpec Compiler                              │
│  main.tsp → Program → @versioned → VersionedView per version   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Version Mutators  │  ← 13 versions → 8 pairs
                    │  (buildPhaseBPairs)│
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Diff Engine      │  ← Compare wire contracts
                    │   (computeDiffs)   │     70+ diff kinds
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Policy Engine    │  ← Classify severity
                    │   (classifyDiffs)  │     by direction + kind
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Suppression      │  ← @approvedBreakingChange
                    │   (applySuppress)  │     origin-aware lookup
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌──────────┐       ┌──────────┐       ┌──────────┐
   │  JSON    │       │ Markdown │       │ Console  │
   │  Report  │       │ PR Comment│      │ + GH Ann │
   └──────────┘       └──────────┘       └──────────┘
```

**Key Design Decisions**:
- Phase B only compares against **previous stable** baseline (preview→preview is not breaking)
- Origin resolution traces diffs back to named declarations → dedup + targeted suppression
- 70+ DiffKind types organized by direction (request-narrowing vs response-widening)
- CI integration mirrors `@azure-tools/typespec-suppressions` pattern

**Talking Points**:
- Version mutators come from `@typespec/versioning` — we don't reimplement version projection
- Canonical HTTP operations come from `@typespec/http-canonicalization` — gives us wire-level comparison
- Origin resolution follows `sourceProperty` chains through spreads/intersections/templates
- Performance bottleneck is version mutator application (~55% of time), not diffing

---

## Slide 3: Results & Next Steps

### Title: Prototype Results & Production Path

**Validation results** (real Azure ARM specs):

| Spec | Versions | Operations | Pairs | Time | Findings |
|------|----------|-----------|-------|------|----------|
| AppConfiguration | 3 (preview) | 29 | 0 | 0s | 0 (no stable baseline) |
| ContainerService/fleet | 13 | 12–42 | 8 | 8.4s | 147 |
| Network | 2 (stable) | 739 | 1 | 7.0s | 71 |

**Quality metrics**:
- 271 tests (unit + integration against real specs)
- 99.2% line coverage, 92% branch coverage
- 71% origin resolution coverage (fleet), 56% (network)

**Questions answered** (all 8 original + 2 new):
1. ✅ Reliable canonical HTTP extraction from versioned TypeSpec
2. ✅ Stable operation identity matching across refactors
3. ✅ Source location tracing (with known template gap)
4. ✅ Circular type handling without infinite loops
5. ✅ Request/response split works for resource models
6. ✅ Suppression with `path:` correctly resolves
7. ✅ Reporting format understandable by reviewers
8. ✅ Performance acceptable for CI (<10s even for largest specs)
9. ✅ CI integration pattern (mirrors typespec-suppressions)
10. ✅ Linear scaling with version count

**Remaining for production**:
| Priority | Item | Effort |
|----------|------|--------|
| P1 | ARM template type parameter tracing (higher origin%) | Medium |
| P2 | Linter rule integration (IDE feedback) | Medium |
| P3 | Git-revision-based analysis (`--base origin/main`) | Low |
| P4 | Version range suppression (`since`/`until`) | Low |
| P5 | Phase A testing with real PR diffs | Low |

**Talking Points**:
- All success criteria met — prototype validates the approach
- Biggest production gap: origin resolution through ARM templates (P1)
- CI integration is ready today (JSON/Markdown/annotations output)
- No performance concerns even at scale — no parallelization needed
- Suppression workflow is complete: decorator on type/property, with guidance in output
- Documentation library covers all 70+ violation types with examples
