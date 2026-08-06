# Implementation Developer Guide

This guide explains how `packages/typespec-breaking-change/src/` is wired together so you can safely extend the tool.

For operational workflow, build/test commands, and deployment notes, read [`prototype-dev-guide.md`](./prototype-dev-guide.md) first. This guide focuses on implementation structure.

## Core pipeline invariants

The important post-processing order is:

```ts
dedup -> merge -> collapse -> suppress -> resolveHeadSourceLocations
```

- **`dedup`**: remove repeated findings produced by reused source declarations.
- **`merge`**: fold matching `Request*` + `Response*` property findings into `Resource*`.
- **`collapse`**: collapse repeated **Phase A** findings across version pairs.
- **`suppress`**: apply decorators after merge so `Resource*` suppressions can match.
- **`resolveHeadSourceLocations`**: only needed for cross-compilation cases where the head declaration must be re-found in the unmutated head program.

The two analysis phases are intentionally different:

- **Phase A (`same-version`)** compares **base program vs head program** at the **same API version**. Any diff is treated as an error because it means projection/source inconsistency.
- **Phase B (`cross-version`)** compares **two versions inside one program** and applies directional breaking-change policy.

Why suppressions get special handling in Phase A: TypeSpec state maps are keyed by **object identity**, so types from the base compilation can never match suppressions stored on equivalent types in the head compilation. The Phase A suppression path therefore falls back to scanning all unversioned suppressions in the head program and matching by kind/path.

Another recurring distinction: **projected names are not always source names**. Code that needs to find a declaration in the unmutated head namespace should prefer the AST/source name (for example `prop.node?.parent?.id?.sv`) over `prop.model?.name`.

---

## 1. Shared Types (`src/types.ts`, `src/diff-kind.ts`)

### Purpose

These files define the common vocabulary used everywhere else: what a diff is, how it is identified, what a finding is, and what phases/results look like.

### Key types

- `DiffKind` (`src/diff-kind.ts`): string union for every detectable change, including merged `Resource*` kinds.
- `DiffComponent`: `"request" | "response"`.
- `OperationIdentity`: `{ method, path, name? }`.
- `OperationDiffIdentity`: operation-relative identity with `component`, optional `statusCode`, and `element`.
- `ServiceDiffIdentity`: service-level identity.
- `DiffIdentity`: union of operation-relative and service-level identities.
- `ApiDiff`: raw structural diff produced by the diff engine.
- `OriginDeclaration`: named declaration used for dedup and suppression.
- `Finding`: classified diff plus severity/phase/suppression metadata.
- `VersionedView`, `ComparisonPair`, `VersionPair`.
- `AnalysisResult`, `AnalysisSummary`, `TimingInfo`.
- Guards: `isOperationIdentity()`, `isServiceIdentity()`.

### Algorithm / flow

`ApiDiff` is intentionally lower-level than `Finding`:

```ts
interface ApiDiff {
  kind: DiffKind;
  identity: DiffIdentity;
  origin?: OriginDeclaration;
  baseType?: Type;
  headType?: Type;
  message: string;
}
```

The pipeline first creates `ApiDiff[]`, then policy turns those into `Finding[]`.

### Extension points

- Add a new diff kind to `DiffKind`.
- Thread the new kind through:
  - diff production
  - policy classification
  - suppression validation (`validDiffKinds`)
  - reporting/reference docs as needed

### Gotchas

- `DiffKind` is the source of truth for decorator validation too, not just reporting.
- `OperationDiffIdentity.element` is the suppression/reporting path; changing its format has broad ripple effects.
- `TimingInfo` has more buckets than the current orchestrator fully populates; do not assume every field is currently measured precisely.

---

## 2. HTTP Canonicalization (`src/diff/canonicalize.ts`, `src/diff/operation-identity.ts`)

### Purpose

This subsystem turns TypeSpec operations into wire-level shapes that can be compared structurally and matched across versions/compilations.

### Key types

- `CanonicalizedOperation`
- `CanonicalizationResult`
- `ResolvedOperation`
- `OperationIdentityMap`
- `OperationIdentity`

Key functions:

- `canonicalizeOperations()`
- `normalizePath()`
- `getOperationIdentity()`
- `identityKey()`
- `resolveOperationIdentities()`

### Algorithm / flow

`canonicalizeOperations()`:

1. Creates a `HttpCanonicalizer`.
2. Calls `listHttpOperationsIn(program, namespace)`.
3. Canonicalizes each `HttpOperation`.
4. Keys the result by normalized wire identity.

Identity normalization is intentionally simple:

```ts
export function normalizePath(path: string): string {
  return path.replace(/\{[^}]+\}/g, "{}");
}
```

So:

- `/widgets/{widgetName}` and `/widgets/{id}` compare as the same route shape.
- Matching key is `METHOD + normalized path`.

### Extension points

- If operation matching needs to become more precise, evolve `OperationIdentity` and `identityKey()`.
- If a new comparison mode needs precomputed operation metadata, extend `CanonicalizedOperation` or `ResolvedOperation`.

### Gotchas

- `resolveOperationIdentities()` and `suppression/match.ts` exist, but the main diff pipeline currently matches operations directly from canonicalization maps in `computeDiffs()`.
- `operations.set(key, ...)` means later duplicates overwrite earlier ones. If two operations canonicalize to the same identity, only one survives.
- `normalizePath()` intentionally erases parameter names; do not use it where name-sensitive matching matters.

---

## 3. Diff Engine (`src/diff/diff-engine.ts`, `src/diff/diff-operations.ts`, `src/diff/diff-types.ts`)

### Purpose

This is the structural comparison core. It matches operations, compares request/response contracts, and produces raw `ApiDiff` records.

### Key types

- `DiffResult`
- `DiffContext`
- `ApiDiff`
- `OperationDiffIdentity`

Key functions:

- `computeDiffs()`
- `diffOperations()`
- `compareTypes()`
- `compareCanonicalizedTypes()`
- `deduplicateDiffs()`

### Algorithm / flow

High level in `computeDiffs()`:

```ts
const baseCanonicalization = canonicalizeOperations(base.program, base.versionedNamespace);
const headCanonicalization = canonicalizeOperations(head.program, head.versionedNamespace);
```

Then:

1. Emit `OperationRemoved` for base-only identities.
2. Emit `OperationAdded` for head-only identities.
3. For matched operations, call `diffOperations()`.
4. Attach `operationSourceLocation` and `operationType` to every operation-relative diff.
5. Run `deduplicateDiffs()` for repeated shared-origin diffs.

`diffOperations()` splits work into:

- `diffRequestParameters()`
- `diffRequestBody()`
- `diffResponses()`

`compareTypes()` in `diff-types.ts` is recursive and dispatches by `Type.kind`:

- `Model` -> property add/remove/optionality/type recursion
- `Scalar` -> scalar-name comparison
- `Enum` -> member add/remove
- `Union` -> variant widen/narrow logic

Cycle detection uses `DiffContext.visited`.

The diff engine also retargets inner type diffs back to a more useful user declaration. Examples:

- array item changes are retargeted to the array model
- property type changes are retargeted to the `ModelProperty`
- union variant changes are retargeted to the `UnionVariant`

That retargeting is critical for suppression lookup and usable locations.

### Extension points

- Add new operation-level comparisons in `diff-operations.ts`.
- Add new type-kind comparisons in `diff-types.ts`.
- Add richer `details` payloads to `ApiDiff` if a reporter/policy needs structured data.

### Gotchas

- `compareTypes()` currently handles `Model`, `Scalar`, `Enum`, and `Union`. Other `Type.kind` values fall through to `[]`.
- `typeChangedKind()`, `typeNarrowedKind()`, and friends infer request/response property vs top-level type semantics from `elementPath`; path-shape changes can affect classification output.
- `deduplicateDiffs()` groups by `{origin.declarationPath, kind}` only; if you need finer-grained grouping, change that deliberately.

---

## 4. Origin Resolution (`src/diff/origin.ts`)

### Purpose

`resolveOrigin()` maps a diff target back to the named source declaration that “owns” it. That enables global deduplication and declaration-scoped suppression.

### Key types

- `OriginDeclaration`
- `ModelProperty`
- `Model`
- `EnumMember`
- `UnionVariant`

Key functions:

- `resolveOrigin()`
- `resolveModelPropertyOrigin()`
- `followSourcePropertyChain()`
- `traceToCanonicalProperty()`
- `climbToNamedAncestor()`

### Algorithm / flow

For `ModelProperty`, the resolver:

1. Follows `sourceProperty` back to the original property.
2. If the property belongs to a named model, returns `Namespace.Model.property`.
3. If the property lives on a visibility-filtered copy, tries `traceToCanonicalProperty()` using shared AST node identity.
4. If the property is on an anonymous model, climbs to a named ancestor property.

The canonicalization copy case is important:

```ts
if (candidate && candidate.node === node && model.name !== prop.model.name) {
  if (model.name.length < prop.model.name.length) {
    return candidate;
  }
}
```

### Extension points

- Extend `resolveOrigin()` when new `Type.kind` values should support origin-based dedup/suppression.
- Improve `climbToNamedAncestor()` if new anonymous-model patterns appear.

### Gotchas

- `EnumMember` resolves to the parent enum, not the member itself.
- Anonymous unions currently do not get a named origin fallback beyond the parent union if it is named.
- `traceToCanonicalProperty()` relies on shared AST node identity and a “shorter model name looks more canonical” heuristic.

---

## 5. Pipeline / Orchestrator (`src/pipeline/orchestrator.ts`, `src/pipeline/policy.ts`, `src/pipeline/versions.ts`)

### Purpose

This subsystem selects version pairs, runs comparisons, classifies diffs, and performs the cross-cutting cleanup passes that turn raw diffs into final findings.

### Key types

- `AnalysisOptions`
- `ServiceVersionInfo`
- `VersionClassifier`
- `VersionPair`
- `VersionComparisonSummary`
- `Finding`

Key functions:

- `analyzeProgram()`
- `analyzeBaseAndHead()`
- `analyzePair()`
- `enumerateVersions()`
- `createVersionedView()`
- `buildPhaseAPairs()`
- `buildPhaseBPairs()`
- `classifyDiffs()`

### Algorithm / flow

#### Version discovery and projection

- `enumerateVersions()` walks `listServices(program)` and `getVersioningMutators()`.
- `createVersionedView()` calls `unsafe_mutateSubgraphWithNamespace()` with a snapshot mutator.

#### Phase A vs Phase B

**Phase A** in `analyzeBaseAndHead()`:

- builds same-version pairs with `buildPhaseAPairs()`
- compares `baseProgram@V` vs `headProgram@V`
- any diff is an error via `classifyPhaseA()`
- records versions with findings as `changedVersions`

**Phase B**:

- in single-program mode, compares each version to the previous stable version
- in base/head mode, compares:
  - brand-new versions in head
  - versions flagged as changed by Phase A

Stable-version selection comes from `buildPhaseBPairs()` + `findPreviousStable()` using `defaultVersionClassifier(version.endsWith("-preview"))`.

#### Post-processing

After pair analysis, the orchestrator runs:

1. `deduplicateBySourceType()`
2. `mergeRequestResponseToResource()`
3. `collapsePhaseADuplicates()`
4. `applySuppressions()`
5. `resolveHeadSourceLocations()` (base/head analysis only)

### Extension points

- Add policy logic in `PHASE_B_RULES` and `refineClassification()`.
- Add new version-selection strategies by swapping `VersionClassifier` logic or pair builders.
- Add new post-processing passes in the orchestrator, but preserve ordering constraints unless you intentionally redesign suppression/resource semantics.

### Gotchas

- `classifyPhaseA()` always returns `severity: "error"`; Phase A is not directional.
- `deduplicateBySourceType()` uses AST node identity when available, not just type object identity.
- `mergeRequestResponseToResource()` happens **before** suppression. That is why decorator validation and matching must understand `Resource*` kinds.
- `collapsePhaseADuplicates()` intentionally ignores version pair when deduplicating Phase A findings.
- `buildComparisonPairs()` is exported but the orchestrator currently uses `buildPhaseAPairs()` / `buildPhaseBPairs()` directly.

---

## 6. Source Location Resolution (`src/pipeline/resolve-location.ts`)

### Purpose

This subsystem decides what file/line should represent a finding in reports and diagnostics, especially when the exact compared wire type has no useful source location.

### Key types

- `ResolvedLocation`
- `SourceTraceLevel`
- `Finding`

Key functions:

- `resolveFindingLocation()`
- `resolveHeadSourceLocations()`
- `resolveTypeLocationWithModelFallback()`

### Algorithm / flow

`resolveFindingLocation()` applies a strict fallback chain:

1. `diff.headSourceLocation`
2. `diff.origin.sourceLocation`
3. `diff.baseSourceLocation`
4. parent/type fallback via `resolveTypeLocationWithModelFallback()`
5. `diff.operationSourceLocation`
6. service namespace fallback

For cross-compilation cases, `resolveHeadSourceLocations()` patches findings after suppression by re-finding the head declaration in the **unmutated** head program:

```ts
const modelName = (prop.node as any)?.parent?.id?.sv ?? prop.model?.name;
```

That is the projected-vs-source-name fix: use the AST/source model name first.

### Extension points

- Add more fallback levels if new diff kinds need better source links.
- Extend `findModelInProgram()` if model lookup eventually needs namespace-aware disambiguation.

### Gotchas

- `resolveHeadSourceLocations()` only patches findings where `headType`/`headSourceLocation` are missing and `baseType` is a `ModelProperty`.
- `findModelInProgram()` searches by model name only; duplicate names in different namespaces could resolve ambiguously.
- `buildSourceUrl()` in the Markdown reporter assumes slash-style path handling, so location formatting and URL building are related concerns if path behavior changes.

---

## 7. Suppression System (`src/suppression/`)

### Purpose

This subsystem lets authors approve intentional changes with decorators, matches those approvals to findings, generates hints/examples/codefixes, and bridges the Phase A cross-compilation identity gap.

### Key types

- `SuppressionMetadata`
- `ResolvedSuppression`
- `SuppressionGuidance`
- `OperationMatchResult`, `MatchedOperation`

Key files/functions:

- `decorators.ts`
  - `$approvedBreakingChange()`
  - `$approvedUnversionedChange()`
  - `findSuppressions()`
  - `findUnversionedSuppressions()`
  - `scanAllUnversionedSuppressions()`
- `suppression.ts`
  - `applySuppressions()`
  - `composeFullIdentityPath()`
- `suppression-guidance.ts`
  - `formatSuppressionGuidance()`
  - `formatSuppressionHint()`
  - `formatSuppressionDiff()`
- `codefixes.ts`
  - `createApproveBreakingChangeCodeFix()`
- `diagnostics.ts`
  - `emitFindingDiagnostics()`
- `match.ts`
  - `matchOperations()` helper for identity matching

### Algorithm / flow

#### Decorator registration and storage

Decorators validate `kind` against `validDiffKinds`, then append `SuppressionMetadata` into a TypeSpec state map keyed by the decorated `Type`.

#### Walking suppression scope

`findSuppressionsWith()` walks parent targets via `walkSuppressionTargets()`:

- property -> model / property type
- model/interface -> namespace
- operation -> interface or namespace
- namespace -> parent namespace

#### Applying suppressions

`applySuppressions()` only evaluates **error** findings. Matching requires:

1. `matchesKind()`
2. `matchesVersion()`
3. `matchesPathOrDirect()`

Direct suppression means “the decorated target is the finding target (or origin target)”; then no `path` is needed. Ancestor suppression requires a path.

Operation-relative paths are normalized by `composeFullIdentityPath()`:

```ts
request.body.properties.tags
responses.200.body.properties.name
```

#### Phase A identity workaround

If Phase A found no identity-based suppressions, `collectSuppressions()` falls back to:

```ts
suppressions.push(...scanUnversionedSuppressions(program));
```

That is the cross-compilation workaround for state maps using object identity.

### Extension points

- Add new suppression options in `lib/decorators.tsp` and `decorators.ts`.
- Extend `matchesPath()` if wildcard or richer path semantics are added.
- Add new codefix styles in `codefixes.ts`.
- Improve IDE integration through `emitFindingDiagnostics()`.

### Gotchas

- `validDiffKinds` must include every suppressible kind, including merged `Resource*` kinds.
- `matchesKind()` deliberately accepts `Request*`/`Response*` aliases for merged `Resource*` findings.
- `applySuppressions()` does not mark ignored findings as suppressed; only error findings are eligible.
- `createApproveBreakingChangeCodeFix()` always emits `approvedBreakingChange`, not `approvedUnversionedChange`.
- `match.ts` is utility code; the main orchestrator does not currently call it.

---

## 8. Reporting (`src/reporting/`)

### Purpose

Reporters turn `AnalysisResult` into output for humans, CI, PR comments, and machine consumption.

### Key types

- `ConsoleReporterOptions`
- `JsonReport`, `JsonFinding`, `JsonReportOptions`
- `MarkdownReportOptions`

Key functions:

- `formatConsoleReport()`
- `formatJsonReport()`
- `renderMarkdownSummary()`
- `formatGithubReport()`

### Algorithm / flow

- **Console**: filters visible findings, renders detail blocks, and appends summary/timing.
- **JSON**: emits the full structured model, including suppression guidance for unsuppressed errors.
- **Markdown**: builds PR-comment-friendly grouped sections plus diff-style suppression snippets.
- **GitHub**: emits a compact markdown table summary for GitHub surfaces.

All reporters rely on `resolveFindingLocation()` for user-facing file/line selection.

### Extension points

- Add a new reporter module and wire it into `src/cli/cli.ts::formatResult()`.
- Add fields to JSON output via `mapFinding()`.
- Add richer PR comment sections to `renderMarkdownSummary()`.

### Gotchas

- Markdown source links depend on `githubRepository`, `githubSha`, and `workspacePath`; without them, identities render as plain code spans.
- `buildSourceUrl()` strips `.base` path segments for Phase A artifact paths.
- Console/GitHub/Markdown reporters each compute counts slightly differently for their presentation goals; keep semantics aligned when changing result meaning.

---

## 9. CLI (`src/cli/`)

### Purpose

The CLI is the executable entry point. It parses arguments, compiles programs, dispatches the right analysis mode, writes reports, emits GitHub annotations, and returns process exit codes.

### Key types

- `CliOptions`
- `CompileOptions`
- `AnalysisOptions`

Key functions:

- `parseArgs()`
- `main()`
- `formatResult()`
- `compileService()`
- `emitGithubAnnotations()`

### Algorithm / flow

`main()`:

1. Parses args.
2. Compiles either:
   - just `entry` (`analyzeProgram`)
   - `base` + `entry` (`analyzeBaseAndHead`)
3. Prints console output.
4. Optionally writes JSON and/or Markdown files.
5. Optionally emits GitHub Actions `::error` annotations.
6. Computes exit code.

`compileService()` wraps `@typespec/compiler.compile()` and auto-injects this package's `lib/main.tsp` via `additionalImports`.

### Extension points

- Add a new format by extending `CliOptions["format"]` and `formatResult()`.
- Add compiler switches in `CompileOptions` / `compileService()`.
- Add more output files or CI modes in `main()`.

### Gotchas

- `parseArgs()` is manual; `yargs` is present in `package.json` but not currently used.
- The usage text still talks about a “spec-folder”, but the parser treats the positional argument as an entry path.
- `failOnBreaking` returns `1` for either unsuppressed errors **or any suppressed findings** (`hasNewSuppressions`), which is stricter than “fail only on unsuppressed”.
- GitHub annotations use `headSourceLocation ?? baseSourceLocation`; if location resolution changes, annotation accuracy changes too.

---

## 10. TypeSpec Library Integration (`src/tsp-index.ts`, `src/lib.ts`)

### Purpose

This is how the tool behaves as a TypeSpec library: it registers diagnostics, declares persistent state maps, and exposes decorator implementations to the compiler.

### Key types

- `$lib`
- `BreakingChangeStateKeys`
- `$decorators`

Key files/functions:

- `src/lib.ts`: `createTypeSpecLibrary(...)`
- `src/tsp-index.ts`: decorator registration object
- `lib/main.tsp`: imports JS and declares `extern dec` signatures
- `lib/decorators.tsp`: decorator option models and public TypeSpec surface

### Algorithm / flow

`src/lib.ts` defines:

- diagnostics:
  - `invalid-suppression-kind`
  - `breaking-change`
- state maps:
  - `approvedBreakingChange`
  - `approvedUnversionedChange`

`src/tsp-index.ts` then binds public decorator names in namespace `Azure.BreakingChange` to JS implementations from `src/suppression/decorators.ts`.

`lib/main.tsp` does two things:

```tsp
import "../dist/src/tsp-index.js";
import "./decorators.tsp";
```

That is the bridge between the TypeSpec compiler and the runtime JS decorator implementation.

### Extension points

- Add new diagnostics/state in `src/lib.ts`.
- Add new decorators by:
  1. declaring them in `lib/decorators.tsp`
  2. implementing them in `src/suppression/decorators.ts`
  3. exporting them from `src/tsp-index.ts`

### Gotchas

- The package `exports` entry in `package.json` is required so TypeSpec can resolve both the `.tsp` surface and JS implementation.
- If `extern dec` exists but JS registration is missing/broken, the symptom is usually “Unknown decorator”.
- `compileService()` auto-injects `lib/main.tsp`, so consumer specs do not need an explicit dependency just to compile suppressions during analysis.

---

## Practical extension checklist

### Add a new diff kind

1. Add it to `src/diff-kind.ts`.
2. Emit it from `diff-operations.ts` or `diff-types.ts`.
3. Classify it in `src/pipeline/policy.ts`.
4. Add it to `validDiffKinds` in `src/suppression/decorators.ts`.
5. Update docs/report expectations if needed.

### Add a new reporter

1. Create `src/reporting/reporter-<name>.ts`.
2. Export it from `src/index.ts`.
3. Add CLI selection in `src/cli/cli.ts::formatResult()`.
4. Add file-writing behavior if it needs its own artifact.

### Add a new suppression mechanism

1. Extend `lib/decorators.tsp` option models and docs.
2. Store metadata in `src/suppression/decorators.ts`.
3. Match it in `src/suppression/suppression.ts`.
4. Update suppression guidance/codefix generation.
5. Re-check Phase A behavior for cross-compilation identity.

### Change source-link behavior

1. Review `resolveFindingLocation()`.
2. Review `resolveHeadSourceLocations()`.
3. Re-check projected-vs-source model name assumptions.
4. Re-check Markdown/GitHub output that consumes resolved locations.
