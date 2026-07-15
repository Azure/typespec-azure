# TypeSpec Breaking Change Tool — Prototype Plan

## Objective

Build a working end-to-end prototype of `@azure-tools/typespec-breaking-change` that validates the
design, demonstrates feasibility, and answers open questions. The prototype should be demoable
against real Azure ARM specs from `markcowl/azure-rest-api-specs`.

## Repository & Branch Strategy

- **Source repo**: `markcowl/typespec-azure` (fork of `Azure/typespec-azure`)
- **Branch**: `prototype/breaking-change-tool` (from latest upstream `main`)
- **Package location**: `packages/typespec-breaking-change/`
- **Demo specs**: `markcowl/azure-rest-api-specs`
- **Target upstream**: `Azure/typespec-azure` (eventual PR target)

---

## Questions the Prototype Must Answer

### Fundamental Feasibility

1. **Can we reliably extract comparable canonical HTTP metadata from versioned TypeSpec programs?**
   Do version mutators + `HttpCanonicalizer` produce stable, structurally comparable output across
   api-versions?

2. **Is operation identity matching stable across refactors?** Does `{method, normalizedPath}` work
   in practice with real Azure ARM specs that use `@route` fragments, resource hierarchies, and
   template patterns?

3. **Can we trace diffs back to TypeSpec source locations accurately?** If we can't map a wire-level
   diff back to the exact TypeSpec declaration, suppressions don't work and the tool isn't useful.
   This must be validated at every stage.

4. **Can we handle recursive/circular type comparisons without infinite loops?** Models reference
   other models, resources reference sub-resources. Does the graph walk terminate correctly?

### Design Validation

5. **Will the split of rules into request/response rules work well for resource models?** ARM
   resource models are identical in requests and responses. Do we need additional diff rules for
   resources (e.g., treating the entire resource as a unit), or does the directional request/response
   split handle this naturally?

6. **Does parent placement with `path:` correctly resolve to removed elements?** If a property is
   removed and the suppression is on the parent model with `path: "properties.legacyField"`, can the
   engine match that to the `PropertyRemoved` finding?

### Usability & Integration

7. **Is the reporting format easily understood by reviewers?** Can we present findings (via GitHub
   issues/PR comments) in a way that reviewers immediately understand what changed, why it's
   breaking, and how to suppress it — or do we need format changes?

### Performance

8. **Is total analysis time acceptable for CI?** Target: <60 seconds for a single service spec
   comparison (compile both versions + compare all version pairs). Measure compilation time vs
   comparison time separately to identify bottlenecks.

---

## Declaration-Centric Deduplication

A model type used in multiple operations (or in both request and response contexts) will produce
multiple raw diffs for the same underlying change. The tool handles this with declaration-centric
deduplication.

### Design

1. **Diff engine walks per-operation** (necessary to preserve directionality)
2. **Each ApiDiff carries an `originDeclaration`** — the TypeSpec node that declares the
   type/property
3. **Before reporting, deduplicate by `{originDeclaration, DiffKind}`** — collapse identical diffs
   from multiple operations into a single finding
4. **The finding annotates which operations are affected**: e.g., "ResponsePropertyWidened on
   `Foo.bar` — affects: `getWidget`, `listWidgets`, `createWidget`"

### Same model in request AND response

If `Foo` appears in both request and response contexts, these are different DiffKinds
(`RequestPropertyRemoved` vs `ResponsePropertyRemoved`), so they remain as separate findings
requiring separate suppressions — one per direction.

### Origin Declaration Resolution

To find the origin declaration for a `ModelProperty` encountered during the diff walk:

1. **If the property's parent model is a named declaration** → the property itself is the source
   location (most common case)
2. **If the parent model is anonymous/unnamed but `sourceProperty` exists** → follow
   `sourceProperty` to find the origin in a named declaration
3. **If neither applies** → the operation parameter itself is the source location (inline
   parameters not derived from any named model)

This determines:
- Where the finding points to (source location for reporting)
- Where the suppression should be placed
- How deduplication groups findings (same origin = same finding)

---

## OAD-Derived Test Fixtures

Existing tools (oad, openapi-diff) have mature test suites covering many breaking change edge cases.
We leverage these to validate the prototype:

### Approach

1. Survey OAD/openapi-diff test fixtures (OpenAPI before/after pairs)
2. Categorize: relevant (HTTP wire contract) vs irrelevant (operationId, extensions, document
   structure)
3. Convert relevant cases from OpenAPI to equivalent TypeSpec (base.tsp / head.tsp)
4. Assert our tool produces the same verdict (breaking / not breaking) for applicable cases
5. Document intentional divergences with rationale

### High-value cases to convert
- Property addition/removal (required vs optional)
- Type changes (string→int, enum member add/remove)
- Parameter changes (add/remove/required change)
- Response status code changes
- Request/response body shape changes
- Constraint changes (minLength, pattern, etc.)

### Cases NOT worth converting
- `operationId` changes (non-goal)
- OpenAPI extension changes
- OpenAPI document structure (path reordering)
- Swagger-specific constructs with no TypeSpec equivalent

### Intentional divergences
Some OAD classifications will differ from ours by design (e.g., response property addition may be
flagged by OAD but is NOT breaking in our Phase B model). These divergences are documented as
design decisions, not test failures.

---

## Process: Validation Loop Between Phases

Each phase concludes with a **validation and discussion checkpoint**:

1. Implement the phase
2. Run validation (tests, manual verification)
3. Present results and any open questions to the user
4. Discuss and resolve before proceeding to next phase

This ensures design assumptions are validated incrementally rather than discovering problems at
integration time.

---

## Architecture Summary

```text
                    ┌─────────────────────────────────────────────────────────────┐
                    │                    Compilation Layer                         │
                    │  TypeSpec Compiler + Version Mutators → Versioned Programs   │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                  Canonicalization Layer                       │
                    │  HttpCanonicalizer → OperationHttpCanonicalization[]          │
                    │  (already exists in @typespec/http-canonicalization)          │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                    Identity Layer                            │
                    │  Build {method, path} keyed maps, match base ↔ head ops     │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                     Diff Engine                              │
                    │  Structural graph walk → ApiDiff[] with source locations     │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                    Policy Engine                             │
                    │  Phase A: all diffs = Error                                  │
                    │  Phase B: directional rules → Error or Ignore                │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                 Suppression Resolution                       │
                    │  Match findings against @approvedBreakingChange metadata     │
                    └────────────────────────────┬────────────────────────────────┘
                                                 │
                    ┌────────────────────────────▼────────────────────────────────┐
                    │                     Reporting                                │
                    │  Console, JSON, GitHub issue/PR comment                      │
                    └─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Package Scaffolding & Core Types

**What**: Set up the package structure and define all core data types that flow through the system.

**Includes**:

- `package.json` with dependencies on `@typespec/compiler`, `@typespec/http`,
  `@typespec/http-canonicalization`, `@typespec/versioning`
- `tsconfig.json` with project references (following `typespec-autorest` pattern)
- vitest config
- Core type definitions:
  - `DiffKind` — string literal union of all diff kinds from the taxonomy
  - `ApiDiff` — the core diff record: `{ kind: DiffKind, sourcePath: SourcePath, baseType?, headType?, message }` where `SourcePath` traces back to TypeSpec source
  - `SourcePath` — `{ file: string, pos: number, end: number, declarationName?: string }` (matches TypeSpec compiler's `SourceLocation`)
  - `Finding` — classified diff: `{ diff: ApiDiff, severity: "error" | "ignore", rule: string, phase: "same-version" | "cross-version", suppressed: boolean }`
  - `ComparisonPair` — `{ base: VersionedView, head: VersionedView, phase }` 
- TypeSpec library registration (`lib.ts`, `tsp-index.ts`) for the suppression decorators

**Source location tracing starts here**: `ApiDiff` carries source location from creation. Every
subsequent layer preserves and augments it.

**Validation**:

- Package builds with `pnpm -r --filter "@azure-tools/typespec-breaking-change..." build`
- Types compile without errors
- A trivial unit test passes (vitest runs)

---

### Phase 2: Compilation & Version Pair Construction

**What**: Compile base and head TypeSpec programs, enumerate versions, build comparison pairs.

**Includes**:

- `compile.ts` — wrapper around `@typespec/compiler` that compiles a TypeSpec entry point and
  returns a `Program`
- `versions.ts` — enumerate all api-versions from a compiled program using `@typespec/versioning`
  APIs (`getVersion`, `VersioningTimeline`)
- `pairs.ts` — build comparison pairs:
  - Phase A: for each version in both base and head, emit `{base@V, head@V, phase: "same-version"}`
  - Phase B: for each new or changed version on head, emit `{head@previousStable, head@newVersion, phase: "cross-version"}`
- `version-mutator.ts` — apply version mutators to produce a versioned program view for a specific
  api-version
- Git ref support: resolve `--base <ref>` to a temporary checkout path (pri 1, can be deferred)

**Validation**:

- Write an integration test that compiles a simple multi-version TypeSpec file:
  ```typespec
  @versioned(Versions)
  namespace TestService;
  enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
  ```
- Assert that version enumeration returns `["2024-01-01", "2025-01-01"]`
- Assert that pair construction produces the expected Phase A and Phase B pairs
- Assert that applying a version mutator produces a program where `@added(Versions.v2)` members
  are absent in v1 and present in v2

---

### Phase 3: Identity Mapping & Canonicalization

**What**: Canonicalize each versioned program view and build identity-keyed operation maps.

**Clarification**: This phase does NOT modify `HttpCanonicalizer`. It *uses* the existing
`@typespec/http-canonicalization` package to extract canonical operations, then builds our own
identity-keyed maps on top.

**Includes**:

- `canonicalize.ts` — for a given versioned program, create an `HttpCanonicalizer`, canonicalize all
  operations, return `CanonicalizedView { operations: Map<OperationIdentity, CanonicalOperation> }`
- `identity.ts` — define `OperationIdentity` as `{method: HttpVerb, normalizedPath: string}` and
  the normalization logic (strip path parameter names, keep structure)
- `match.ts` — match base operations to head operations by identity; track unmatched as
  added/removed

**Source tracing**: Each `CanonicalOperation` retains a reference to the original TypeSpec
`Operation` node (which has `node.pos` and `node.end` in a `SourceFile`).

**Validation**:

- Integration test: compile a TypeSpec service with 2 operations, canonicalize, assert operations
  are keyed correctly by `{GET, /things/{thingId}}` etc.
- Test that unmatched operations are detected (add an op in head, remove one from base)
- Test that path normalization handles ARM patterns:
  `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Foo/bars/{barName}`

---

### Phase 4: Diff Engine

**What**: The core structural comparison. Walk matched operation pairs and detect all differences.

**Includes**:

- `diff-engine.ts` — main entry point: `computeApiDiffs(baseView, headView): ApiDiff[]`
- `diff-operations.ts` — compare two matched operations:
  - Request parameters (path, query, header): added, removed, type changed, required/optional changed
  - Request body: property added/removed/type changed, required/optional changed
  - Response status codes: added/removed
  - Response body: property added/removed/type changed
  - Response headers: added/removed/type changed
  - Content types: added/removed
- `diff-types.ts` — recursive type comparison:
  - Scalar comparison (including format/encoding via `wireType`)
  - Enum comparison (members added/removed — open vs closed)
  - Union comparison (variants added/removed, open vs closed)
  - Model comparison (properties added/removed/changed — recursive)
  - Array comparison (item type — recursive)
  - Record comparison (value type — recursive)
- `diff-utils.ts` — cycle detection (visited set), type equivalence checks

**Source tracing**: Every `ApiDiff` created in this phase carries the source location from the
TypeSpec node that produced the canonical element being compared. For properties, this is the
`ModelProperty` node. For operations, the `Operation` node.

**Key design question validated here**: Does comparing request properties and response properties
separately work for ARM resource models? The same `Model` appears in both request and response — we
need to verify the canonicalizer produces distinct request-visible and response-visible projections
via visibility.

**Validation**:

- Unit tests for each diff kind:
  - Property added (required vs optional)
  - Property removed
  - Property type changed (string → int32)
  - Parameter added/removed
  - Operation added/removed
  - Status code added/removed
  - Type widening (enum member added, closed→open)
  - Type narrowing (enum member removed, open→closed)
  - Format change (@encode change causing different wireType)
- Integration test: compile two versions of a simple service, diff them, assert expected ApiDiff[]
- Cycle detection test: model with self-reference, ensure no infinite loop
- **Resource model test**: ARM-style resource with same model in request/response, verify that
  request-side and response-side diffs are independent and correct

---

### Phase 5: Policy Engine & Classification

**What**: Classify each ApiDiff as Error or Ignore based on phase and directional rules.

**Includes**:

- `policy.ts` — `classifyDiffs(diffs: ApiDiff[], context: ComparisonContext): Finding[]`
- `phase-a-policy.ts` — trivial: all diffs → Error (any change to published version is breaking)
- `phase-b-policy.ts` — directional rules:
  - Request narrowing (parameter removed, required added, type narrowed) → Error
  - Response widening (property added, type widened, status code added) → Error
  - Request widening (optional parameter added, type widened) → Ignore
  - Response narrowing (type narrowed, optional property removed from response) → Ignore
  - Format changes → Error regardless of direction
  - Service-level rules (version removed, auth scheme removed) → Error
- `direction.ts` — determine whether a diff is narrowing or widening based on DiffKind and context

**Validation**:

- Unit tests for each classification rule:
  - Phase A: any diff → Error
  - Phase B request narrowing: required parameter added → Error
  - Phase B response widening: optional response property added → Ignore (NOT breaking)
  - Phase B format change → Error
  - Verify resource model property changes get correct directional classification based on
    whether they're in the request projection or response projection
- Integration test: end-to-end from TypeSpec to classified findings

---

### Phase 6: Suppression Decorators

**What**: Implement `@approvedBreakingChange` and `@approvedUnversionedChange` decorators, register
them as a TypeSpec library, and implement matching logic.

**Includes**:

- `lib.ts` — TypeSpec library definition with decorator signatures
- `decorators.ts` — decorator implementations that write structured metadata (DiffKind, path,
  since, reason) to the type graph via state maps
- `suppression.ts` — matching logic:
  - For each finding, check if a matching suppression exists on the affected declaration or its
    ancestor
  - Direct placement: decorator on the same node → match by DiffKind
  - Parent placement: decorator on ancestor with `path:` → resolve path to find the target,
    match against finding
- `tsp-index.ts` — register the library and decorators

**Source tracing is critical here**: The suppression matcher must:

1. Know the source location of the finding (from ApiDiff)
2. Know the source location of the suppression decorator
3. Match them based on declaration identity (node identity for direct, ancestor + path for parent)

**Validation**:

- Unit test: declare a model with `@approvedBreakingChange` on a property, verify the decorator
  metadata is retrievable
- Unit test: parent placement with `path:` resolves correctly to the removed property
- Integration test: compile a spec with a breaking change AND a matching suppression, verify the
  finding is marked `suppressed: true`
- Integration test: compile a spec with a breaking change and NO suppression, verify finding is
  NOT suppressed
- Integration test: compile a spec with a mismatched suppression (wrong DiffKind), verify finding
  is NOT suppressed

---

### Phase 7: CLI & Reporters

**What**: Standalone CLI binary and output formatters.

**Includes**:

- `cli.ts` — argument parsing (`--base`, `--head`, `--version`, `--format`, `--base-only`,
  `--cross-version-only`)
- `cli-runner.ts` — orchestrates: compile → pairs → canonicalize → diff → classify → suppress → report
- `reporter-console.ts` — human-readable terminal output:
  ```
  ERROR  ResponsePropertyRemoved  at src/main.tsp:45
    Response property 'legacyStatus' was removed from BarProperties
    Phase: cross-version (2024-01-01 → 2025-01-01)
    Suppress: @approvedBreakingChange("ResponsePropertyRemoved", { reason: "..." })
  ```
- `reporter-json.ts` — machine-readable JSON output
- `reporter-github.ts` — format findings as GitHub issue body or PR comment markdown
- Performance instrumentation: timing for each stage (compile, canonicalize, diff, classify)
- Input resolution: file paths (pri 0), git refs (pri 1)
- `bin/typespec-breaking-change.js` — entry point for standalone execution
- Exit codes: 0 = no errors, 1 = breaking changes found, 2 = analysis failure

**Validation**:

- Run CLI against a simple test fixture, verify console output is correct
- Run CLI against a real Azure ARM spec from `markcowl/azure-rest-api-specs`, verify it completes
  without errors and produces reasonable output
- Verify JSON output schema is parseable
- Verify GitHub reporter produces valid markdown
- Measure and report timing for a real spec (target: <60s total)

---

### Phase 8: Integration Testing with Real Specs

**What**: End-to-end tests against real Azure ARM specs demonstrating the full pipeline.

**Includes**:

- Clone/reference `markcowl/azure-rest-api-specs` for test fixtures
- Create test scenarios:
  1. **No breaking changes**: new version adds optional properties → all Ignore
  2. **Breaking change detected**: remove a property from a resource → Error
  3. **Suppressed breaking change**: same as above but with `@approvedBreakingChange` → suppressed
  4. **Phase A violation**: modify an existing version → all diffs are Error
  5. **Type widening in response**: enum gains a member → Error (response widening)
  6. **Format change**: `@encode` changed → Error
  7. **Resource model test**: ARM resource with shared model in request/response, verify directional
     rules produce correct results
- Performance validation: run against a large ARM spec (Compute or Network), log timing
- GitHub integration test: generate PR comment markdown from findings, verify it's comprehensible

**Validation**:

- All integration tests pass
- Performance is within target (<60s for largest spec)
- Output is understandable to someone unfamiliar with the tool
- The resource model question (Q5) is answered definitively

---

## Phase Dependencies

```text
Phase 1 ─────► Phase 2 ─────► Phase 3 ─────► Phase 4 ─────► Phase 5
                                                │                │
                                                │                ▼
                                                │           Phase 6 (suppressions)
                                                │                │
                                                ▼                ▼
                                           Phase 7 (CLI, needs Phase 5 + 6)
                                                │
                                                ▼
                                           Phase 8 (integration tests)
```

- Phases 1→2→3→4 are strictly sequential (each depends on previous)
- Phase 5 depends on Phase 4
- Phase 6 depends on Phase 4 (needs diff types) + Phase 1 (needs library registration)
- Phase 7 depends on Phase 5 + Phase 6
- Phase 8 depends on Phase 7

Note: A minimal CLI can be introduced as early as Phase 4 (for manual verification of diff output
during development), but the full CLI with all reporters is Phase 7.

---

## Source Location Tracing — Threading Through All Phases

Source location is NOT a late addition. It is threaded through every phase:

| Phase | How source location is captured |
|-------|-------------------------------|
| 2 (Compilation) | TypeSpec `Program` nodes have `node.pos`, `node.end`, `node.file` |
| 3 (Canonicalization) | `OperationHttpCanonicalization` retains reference to source `Operation` node |
| 4 (Diff Engine) | Every `ApiDiff` created carries `sourcePath` from the TypeSpec node that produced the canonical element. For removed elements, the source is the base node. For added elements, the source is the head node. |
| 5 (Policy) | `Finding` inherits source from its `ApiDiff` |
| 6 (Suppression) | Decorator source location is compared against finding source location for matching |
| 7 (Reporting) | Source location is formatted as `file:line:col` for console, or as a link for GitHub |

---

## Performance Strategy

Rather than a benchmark suite, the CLI instruments timing at each stage:

```
[compile base]       2.3s
[compile head]       2.1s
[version mutators]   0.3s
[canonicalize]       0.4s
[identity matching]  0.01s
[diff engine]        0.8s
[classify]           0.02s
[suppress]           0.01s
[report]             0.05s
[total]              6.0s
```

The hypothesis is that compilation dominates (~80% of time) and is a fixed cost shared with all
TypeSpec tooling. The comparison itself should be O(operations × properties) — even Compute's ~200
operations should diff in under a second.

We validate this by running against 2-3 real ARM specs of different sizes from
`markcowl/azure-rest-api-specs`.

---

## Technology Choices

| Concern | Choice | Reason |
|---------|--------|--------|
| Language | TypeScript | Same as all typespec-azure packages |
| Test framework | vitest | Repo standard |
| Build | tsc with project references | Repo standard |
| CLI arg parsing | yargs | Already in repo catalog |
| Package manager | pnpm | Repo standard |
| Formatter | prettier | Repo standard |
| Changelog | @chronus/chronus | Repo standard |

---

## What Success Looks Like

After the prototype is complete, we can:

1. Run `typespec-breaking-change --base ./v1 --head ./v2` against real Azure ARM specs
2. See accurate breaking change findings with correct source locations
3. Add `@approvedBreakingChange` to a spec and see findings become suppressed
4. See timing output showing the tool runs in <60s for real specs
5. Generate a GitHub issue/PR comment that a reviewer can understand without explanation
6. Answer definitively whether resource models need special handling or whether the
   request/response directional split is sufficient
7. Answer whether operation identity by `{method, path}` is stable across real ARM spec evolution
