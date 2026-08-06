# TypeSpec Breaking Change Detection Tool (`@azure-tools/typespec-breaking-change`)

## 1. Title and Introduction

`@azure-tools/typespec-breaking-change` is a dedicated breaking change detector for TypeSpec-authored HTTP APIs. It exists to compare the wire-level shape of a service across branches and across `api-version` values without depending on emitted OpenAPI, which avoids false positives from emitter-specific document changes and gives results that map back to the original TypeSpec source.

The tool is intended for Azure REST API authoring workflows where reviewers need a reliable answer to a simple question: did this PR change an existing contract in a way that will break clients? Its job is to answer that question using canonical HTTP metadata, stable endpoint identities, and CI-friendly reporting.

## 2. Goals and Non-Goals

### Goals

The tool is designed to do the following:

- Detect breaking HTTP API changes between a base branch and a head branch.
- Detect breaking HTTP API changes across `api-version` evolution on the head branch.
- Treat both same-version regressions and cross-version evolution checks as first-class comparison modes.
- Compare APIs at the wire contract level.
- Trace findings back to TypeSpec source locations.
- Use stable endpoint identities so results survive refactors that do not change the wire contract.
- Support fine-grained, per-change suppression so approved exceptions can be recorded inline with the spec.
- Integrate with GitHub CI so findings can surface as diagnostics, machine-readable output, and PR feedback.
- Replace OpenAPI-based breaking change tools for TypeSpec-authored specifications.
- Coexist with OpenAPI-based breaking change tools for hand-authored OpenAPI specifications that are outside this tool's scope.

### Non-Goals

The tool is explicitly not trying to solve every compatibility problem around a service. The following are out of scope:

- SDK-facing concerns such as generated client names or client-shaping behavior.
- `operationId` and schema/model names, because they are not part of the HTTP wire contract and are primarily SDK/client concerns.
- Comparison of hand-authored OpenAPI documents.
- Long-running operation semantics.
- Pagination semantics.
- OpenAPI extension tracking.

In other words, the tool focuses on HTTP contract compatibility as represented by TypeSpec's compiled HTTP model. It does not attempt to be a general-purpose API governance engine, SDK review tool, or OpenAPI document differ.

## 3. Design Overview

### Summary

The design centers on comparing two compiled views of a TypeSpec service: one from the base input and one from the head input. For each comparison pair, the tool compiles TypeSpec, applies version mutators to materialize the desired `api-version`, canonicalizes the resulting HTTP metadata with `HttpCanonicalizer`, classifies the observed differences with breaking-change rules, and reports findings.

### Architectural shape

At a high level, the execution flow is:

1. Compile the base TypeSpec input.
2. Compile the head TypeSpec input.
3. Apply TypeSpec version mutators to produce the versioned views that need comparison.
4. Canonicalize each versioned view with `@typespec/http-canonicalization`.
5. Build identity-keyed maps of operations and HTTP components.
6. Walk the type graphs.
7. Feed structural differences into the rule classifier.
8. Emit findings, then resolve suppressions and format output.

### Canonicalization as the comparison boundary

The design relies on `@typespec/http-canonicalization` to extract canonical HTTP metadata from each compiled program view. That library provides the wire-facing shape of operations, parameters, request bodies, responses, content types, visibility-aware projections, and type transformations needed for comparison.

This keeps the tool focused on comparison rather than re-implementing TypeSpec's HTTP interpretation rules. The breaking change detector still owns identity extraction, comparison pairing, graph walking, rule evaluation, suppression resolution, and reporting, but it deliberately reuses canonical HTTP extraction instead of rebuilding it.

### Reporting model

The output of graph walking is not the final user-facing result. The output of graph walking is a flat list of typed diffs (see `diff-taxonomy.md`). These diffs are then classified by the policy engine based on comparison context: in Phase A, all diffs are errors; in Phase B, named rules map diffs to Error or Ignore (see `breaking-change-classification.md`). Suppression is applied in the policy layer — when a diff matches `@approvedBreakingChange` or `@approvedUnversionedChange` metadata on the affected type, it is suppressed before reporting. Findings are then reported with enough context to support:

- CLI output,
- CI annotations,
- PR feedback,
- per-change suppression matching,
- traceability back to TypeSpec source.

### Simple pipeline diagram

```text
Base TypeSpec ── compile ── version mutators ── HttpCanonicalizer ──┐
                                                                    ├── graph walk ── rules ── findings
Head TypeSpec ── compile ── version mutators ── HttpCanonicalizer ──┘
                                                                                      │
                                                                                      └── suppressions / CI output
```

For the complete taxonomy of detectable diffs, see `diff-taxonomy.md`. For classification policies, see `breaking-change-classification.md`. For detailed rule definitions and type transition tables, see `typespec-breaking-change-rules.md`.

A more comparison-oriented view is:

```text
base@V or base@S  ── canonicalize ──┐
                                    ├── compare matching HTTP graphs ── classify ── report
head@V or head@N  ── canonicalize ──┘
```

### Brief code sketch

```ts
const basePrograms = compileAllRequestedVersions(baseInput);
const headPrograms = compileAllRequestedVersions(headInput);
const comparisonPairs = buildComparisonPairs(basePrograms, headPrograms, options);

for (const pair of comparisonPairs) {
  const baseOps = canonicalizeOperations(pair.baseProgram);
  const headOps = canonicalizeOperations(pair.headProgram);

  // Diff engine: detect all changes (context-neutral)
  const diffs = computeApiDiffs(baseOps, headOps);

  // Policy engine: classify by context
  const policy = pair.phase === "same-version" ? phaseAPolicy : phaseBPolicy;
  const findings = classifyDiffs(diffs, policy);

  for (const finding of findings) {
    report(finding);
  }
}
```

The important point in this sketch is not the exact function shape. It is the comparison strategy:

- canonicalize each versioned view,
- correlate by stable operation identity,
- walk the type graphs,
- classify differences with rule logic,
- report findings with source-aware context.

## 4. How Comparisons Work

### Comparison phases

The tool performs comparisons in two distinct phases.

### Phase A: same-version regression

For every version that exists on both the base branch and the head branch, the tool compares:

- `base@V`
- `head@V`

This is the regression check for an already-existing contract. Any difference found here means the PR changed a version that already existed.

In Phase A, all observable diffs are errors — including additive changes like adding an operation or optional parameter. Modifying an existing api-version in any way requires introducing a new version. The diff engine detects all changes; the Phase A policy classifies every one of them as an error without exception.

Conceptually:

```text
base@2023-01-01  vs  head@2023-01-01
base@2024-01-01  vs  head@2024-01-01
base@2024-05-01-preview  vs  head@2024-05-01-preview
```

If the same version exists on both sides, it is compared directly to itself across branches. This is the primary way the tool detects regressions in published or previously-declared versions.

### Phase B: cross-version evolution

After Phase A, the tool evaluates versions that are new or changed on the head branch.

For every new or changed version on head, the tool compares that version against the **previous stable** version.

That means the comparison shape is:

- `head@previousStable` vs `head@newPreview`
- `head@previousStable` vs `head@newStable`
- `head@previousStable` vs `head@changedVersion` (if a version was modified in Phase A)

Examples:

```text
head@2024-01-01         vs  head@2024-05-01-preview
head@2024-01-01         vs  head@2025-01-01
```

This phase evaluates whether the newly introduced version evolves from the last stable contract in a breaking way.

### Baseline rules

The baseline policy is strict and intentionally simple:

- Previews are never baselines.
- New versions are always compared to the previous stable version.
- Preview-to-preview comparison is not used to determine breaking change results.
- All differences that map to breaking changes are reported as errors.

This policy avoids creating a chain of preview baselines that would make results hard to reason about and easy to manipulate.

### Version enum integrity

Before comparison begins, the tool validates the version model itself.

The following integrity rules are part of the design:

- Stable versions cannot be removed.
- Versions must be monotonically increasing.
- Preview replacement is allowed.

These checks protect the meaning of the comparison matrix. If version ordering is invalid, or if a stable version disappears, the comparison result is no longer trustworthy as a contract evolution analysis.

### Pair selection logic

At a high level, pair construction looks like this:

```ts
for (const version of versionsPresentInBaseAndHead) {
  compare(base.at(version), head.at(version), { phase: "same-version" });
}

for (const version of versionsOnlyInHead) {
  const stableBaseline = findPreviousStable(version, head.versions);
  compare(head.at(stableBaseline), head.at(version), { phase: "cross-version" });
}
```

Once a pair is selected, the engine uses the same structural comparison flow for both phases:

1. Build identity-keyed operation maps.
2. Match operations by method and normalized path.
3. Compare request components.
4. Compare response components.
5. Recurse through nested wire types.
6. Classify each structural difference.
7. Report any breaking finding as an error.

### What gets compared inside a pair

Within each selected pair, the tool compares canonical HTTP metadata such as:

- operation identity (path and method),
- request path/query/header parameters,
- request body shape,
- response status codes,
- response body shapes,
- response headers,
- content-type-specific wire representations.

The comparison is structural and directional. For example, what is breaking for a request payload is not always the same as what is breaking for a response payload, so the rule engine evaluates the direction and context of each change after the graph walker records the difference.

### CLI surface

The comparison engine is exposed through a CLI that selects the inputs, scope, and output format.

Core flags:

- `--base`
- `--head`
- `--version`
- `--format`

Supported modes:

| Mode               | Description                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| Full matrix        | Run Phase A and Phase B together.                                              |
| Base-only          | Run only same-version comparisons between base and head.                       |
| Cross-version-only | Run only new-version comparisons on head against the previous stable baseline. |
| Specific pair      | Compare one explicitly selected version pair.                                  |

A representative shape of the interface is:

```text
typespec-breaking-change --base <path-or-ref> --head <path> --format console
typespec-breaking-change --base <path-or-ref> --head <path> --version <api-version>
typespec-breaking-change --base-only --base <path-or-ref> --head <path>
typespec-breaking-change --cross-version-only --head <path>
typespec-breaking-change --compare <fromVersion> <toVersion> --head <path>
```

---

## 5. Breaking Change Rules (Summary)

The `@azure-tools/typespec-breaking-change` tool evaluates wire compatibility by comparing a version to the **previous stable version**.
For versions that already existed before the change, the same rule semantics still apply when the tool detects a structural regression.

Rules are evaluated against canonical HTTP metadata.
That means the tool cares about the observable contract on the wire: operation identity, parameters, payload shapes, status codes, headers, content types, authentication, and encoded value sets.

For detailed rule descriptions with examples, see `typespec-breaking-change-rules.md`.

### Phase B Classification Principle

In Phase B, the classification follows a simple directional principle:

- **Request narrowing** is always breaking (Error) — the server accepts fewer inputs.
- **Response widening** is always breaking (Error) — the server returns more outputs.
- **Request widening** is not breaking (Ignore) — the server accepts more inputs.
- **Response narrowing** is not breaking (Ignore) — the server returns fewer outputs.
- **Format changes** are always breaking (Error) regardless of direction.

**Narrowing and widening** refer to the set of possible values a type can represent, not the presence or absence of properties (which are handled by dedicated `PropertyAdded`/`PropertyRemoved` rules). How narrowing and widening are determined depends on the type category:

- **Scalars**: A more restrictive format is narrowing (e.g., `string` → `url`); a less restrictive format is widening.
- **Enums**: Enums represent a closed value set. Adding members is widening; removing members is narrowing.
- **Unions**: Unions can represent a closed or open value set. Moving from closed to open is widening; open to closed is narrowing.
- **Arrays**: Determined by the item type (applied recursively).
- **Records**: Determined by the value type (applied recursively).
- **Models**: Narrowing/widening rules are applied recursively to each property of the model.

### Service-Level Rules

| DiffKind                     | Rule                                    | Severity |
| ---------------------------- | --------------------------------------- | -------- |
| `ApiVersionRemoved`          | Removing a stable api-version           | Error    |
| `AuthSchemeRemoved`          | Removing an authentication scheme       | Error    |
| `AuthSchemeAdded` (required) | Adding a required authentication scheme | Error    |
| `OAuthScopeAdded`            | Narrowing OAuth scopes                  | Error    |

> **Note:** Changes to ARM common-types versions are handled by comparing the underlying schemas. Changing a common-types version reference is only breaking if the underlying wire shape changes.

### Operation-Level Rules

| DiffKind                | Rule                                   | Severity |
| ----------------------- | -------------------------------------- | -------- |
| `OperationRemoved`      | Removing an endpoint                   | Error    |
| `OperationRouteChanged` | Changing an operation's method or path | Error    |

### Request Rules

| DiffKind                                                                                     | Rule                                   | Severity |
| -------------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| `RequestPathParameterAdded` / `RequestQueryParameterAdded` / `RequestHeaderAdded` (required) | Adding a required parameter            | Error    |
| `RequestPathParameterRemoved` / `RequestQueryParameterRemoved` / `RequestHeaderRemoved`      | Removing a parameter                   | Error    |
| `RequestPropertyAdded` (required)                                                            | Adding a required body property        | Error    |
| `RequestPropertyRemoved`                                                                     | Removing a body property               | Error    |
| `RequestTypeChanged`                                                                         | Incompatible type/format change        | Error    |
| `RequestTypeNarrowed`                                                                        | Accepting fewer values                 | Error    |
| `RequestPropertyTypeNarrowed`                                                                | Request property type narrowed         | Error    |
| `EnumValueRemoved` (request)                                                                 | Removing from closed enum/union        | Error    |
| `RequestTypeKindChanged`                                                                     | Model shape change (e.g., Model→Array) | Error    |
| `RequestEncodingChanged`                                                                     | Serialization/encoding change          | Error    |
| `RequestConstraintStrengthened`                                                              | Tighter validation constraint          | Error    |
| `RequestParameterMadeRequired`                                                               | Optional→required parameter            | Error    |
| `RequestPropertyMadeRequired`                                                                | Optional→required body property        | Error    |
| `RequestParameterLocationChanged`                                                            | Moving between header/query/path/body  | Error    |
| `RequestParameterDefaultChanged`                                                             | Changing a parameter default value     | Error    |
| `RequestPropertyDefaultChanged`                                                              | Changing a property default value      | Error    |
| `RequestContentTypeRemoved`                                                                  | Removing a request content type        | Error    |

### Response Rules

| DiffKind                               | Rule                             | Severity |
| -------------------------------------- | -------------------------------- | -------- |
| `ResponsePropertyRemoved`              | Removing a response property     | Error    |
| `ResponseTypeChanged`                  | Incompatible type/format change  | Error    |
| `ResponseTypeWidened`                  | Returning more possible values   | Error    |
| `ResponseTypeKindChanged`              | Model shape change               | Error    |
| `ResponseStatusCodeAdded`              | Adding a new status code         | Error    |
| `ResponseStatusCodeRemoved`            | Removing a status code           | Error    |
| `ResponseContentTypeAdded`             | Adding a response content type   | Error    |
| `ResponseContentTypeRemoved`           | Removing a response content type | Error    |
| `ResponseHeaderRemoved`                | Removing a response header       | Error    |
| `ResponsePropertyMadeOptional`         | Required→optional property       | Error    |
| `ResponsePropertyTypeWidened`          | Response property type widened   | Error    |
| `ResponseConstraintRelaxed`            | Constraint relaxed in response   | Error    |
| `ErrorResponseAdded`                   | Adding an error status code      | Error    |
| `ErrorResponseRemoved`                 | Removing an error status code    | Error    |
| `UnionVariantAdded` (closed, response) | Adding to closed union/enum      | Error    |

### Model and Type Rules

Models in TypeSpec represent three distinct wire shapes:

1. **Models with properties** — compared property-by-property
2. **Arrays** — changes to the item type are recursively processed
3. **Records** — changes to the value type are recursively processed

Changes between these shapes (e.g., Model→Array, Record→Model) are always breaking (`TypeKindChanged`).

| DiffKind                          | Rule                                              | Severity |
| --------------------------------- | ------------------------------------------------- | -------- |
| `TypeKindChanged`                 | Change between Model/Array/Record                 | Error    |
| `RequestPropertyAdded` (required) | New required property in request                  | Error    |
| `RequestPropertyRemoved`          | Request property removed                          | Error    |
| `ResponsePropertyRemoved`         | Response property removed                         | Error    |
| `RequestPropertyTypeChanged`      | Request property type incompatibly changed        | Error    |
| `ResponsePropertyTypeWidened`     | Response property type widened                    | Error    |
| `ResponsePropertyMadeOptional`    | Response property weakened (required→optional)    | Error    |
| `RequestPropertyMadeRequired`     | Request property strengthened (optional→required) | Error    |

### Enum, Union, and Scalar Rules

- All enums are **closed**. Adding a member widens (Error in response, Ignore in request). Removing narrows (Error in request, Ignore in response).
- **Open unions** (include base scalar like `string`): adding or removing named variants is not breaking.
- **Closed unions**: adding widens (Error in response, Ignore in request), removing narrows (Error in request, Ignore in response).
- Scalars: evaluated by the type transition tables in `typespec-breaking-change-rules.md`.

### Encoding Rules

Any change to `@encode` that results in a different wire representation is an Error.
The only non-change is when an explicit `@encode` matches the previous default encoding.

Default encodings:

- `bytes` → `base64` (string)
- `utcDateTime` → `rfc3339` (string), except in HTTP headers where the default is `rfc7231`
- `offsetDateTime` → `rfc3339` (string)
- `duration` → `ISO8601` (string)

## 6. Suppression Mechanism

Every approved breaking change lives inline in TypeSpec source via the `@approvedBreakingChange` decorator (for Phase B breaks) or `@approvedUnversionedChange` decorator (for Phase A same-version changes).
Approvals are version-controlled, reviewable, and co-located with the declarations they affect.
That keeps the approval record in the same PR as the API change, instead of splitting intent across external manifests or CI-only state.

The design uses two suppression decorators:

- `@approvedBreakingChange` suppresses Phase B breaking changes. New or modified instances add the `BreakingChangeReviewRequired` label.
- `@approvedUnversionedChange` suppresses Phase A violations (same-version regressions). New or modified instances add the `VersioningReviewRequired` label.

The two decorators exist to prevent a Phase B approval from accidentally suppressing a Phase A violation.
Each decorator writes to a separate metadata key in the type graph, and the policy layer only consults the relevant decorator metadata for each phase.

Suppressions can be attached in two ways:

- **Direct placement** on the surviving declaration.
- **Parent placement** on the nearest surviving ancestor, with `path:`.

In both cases, the goal is the same: make approvals explicit, durable under ordinary editing, and easy for reviewers to inspect.

### 6.1 Direct Placement

Direct placement is the common case.
When a breaking change occurs on a declaration that still exists in the new version, the suppression decorator goes directly on that declaration.
The approval identity is derived from the AST position of the decorated node.

This is the right fit for changes such as:

- property type changed
- scalar encoding changed
- constraint tightened
- optional property made required
- parameter made required
- discriminator shape changed

Example:

```typespec
model BarProperties {
  @approvedBreakingChange(
    "ResponseTypeWidened",
    {
      reason: "Widening count to int64 for large resource counts",
    }
  )
  @typeChangedFrom(Versions.v2024_01_01, int32)
  count: int64;
}
```

In this form, no `path` value is needed.
The decorator is already attached to the exact node that triggered the finding.
The tool matches the finding to the declaration identity and sees the approval immediately.

This form is intentionally simple:

1. the `DiffKind` identifies **what kind of breaking change** is being approved
2. the decorated declaration identifies **where the change happened**
3. the optional `reason` explains **why the approval is acceptable**

Because the node survives into the new version, the approval survives with it.
That makes direct placement stable across normal edits such as file moves, nearby formatting changes, or declaration reordering.

Direct placement covers roughly **80%** of expected suppression scenarios.
It is the preferred authoring path because it is short, local, and easy to review.
The same placement rules apply to `@approvedUnversionedChange` when approving a Phase A regression on a surviving declaration.

### 6.2 Parent Placement

Parent placement exists for the cases where the target node does **not** survive into the new version, or where the change is on inlined types rather than a standalone declaration.
In those cases, the suppression decorator goes on the nearest surviving ancestor and uses a `path:` value to identify the affected element.

Typical parent placement cases include:

- removed property
- removed operation
- removed enum member
- removed response header
- removed response status code
- inline request/response metadata changes with no dedicated declaration node

#### Removed property

When a property is removed, the approval is placed on the model that still survives:

```typespec
@approvedBreakingChange(
  "ResponsePropertyRemoved",
  {
    path: "properties.legacyStatus",
    reason: "Removed after deprecation period; field was never populated by the service",
  }
)
model BarProperties {
  @removed(Versions.v2024_01_01)
  legacyStatus: string;
}
```

The approval anchor is the model.
The `path` value identifies the removed property under that model.

#### Removed operation

When an operation is removed, the approval is placed on the containing interface or namespace:

```typespec
@approvedBreakingChange(
  "OperationRemoved",
  {
    path: "DELETE /subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}",
    reason: "Delete was retired in favor of soft-delete semantics",
  }
)
interface Bars {
  @removed(Versions.v2024_01_01)
  delete is ArmResourceDeleteAsync<Bar>;
}
```

Here the interface is the surviving anchor.
A namespace works the same way when the operation is defined directly under a namespace.
The `path` is the wire identity of the removed endpoint.

#### Removed response header

When the change is on inline response metadata, the approval is placed on the operation:

```typespec
@approvedBreakingChange(
  "ResponseHeaderRemoved",
  {
    path: "responses.200.headers.X-Custom-Id",
    reason: "Custom correlation header replaced by standard tracing headers",
  }
)
op getBar(@path barName: string): {
  @removed(Versions.v2025_01_01)
  @header("X-Custom-Id")
  xCustomId: string;

  @body body: Bar;
};
```

When HTTP metadata is part of a shared model, the approval is placed on that model:

```typespec
@approvedBreakingChange(
  "ResponseHeaderRemoved",
  {
    path: "properties.xCustomId",
    reason: "Custom correlation header replaced by standard tracing headers",
  }
)
model Bar {
  @removed(Versions.v2025_01_01)
  @header("X-Custom-Id")
  xCustomId: string;

  name: string;
}

op getBar(@path barName: string): Bar;
```

Since the decorator's metadata is available on the model type, the tool's suppression lookup (which walks up the type chain) finds it naturally.

#### Path notation

Parent placement paths use the same notation the diff engine uses when it describes where a finding occurred.
Common forms include:

- `properties.X`
- `request.body.properties.X`
- `request.query.X`
- `request.path.X`
- `request.headers.X`
- `responses.200.body.properties.Y`
- `responses.200.headers.Z`
- `responses.204`
- `request.body.contentTypes.application/json`

A few concrete examples:

- `request.body.properties.tags`
- `request.query.filter`
- `request.path.barName`
- `responses.200.body.properties.provisioningState`
- `responses.200.headers.ETag`

The anchor determines how the path is interpreted:

- on a **model**, paths are rooted at that model, for example `properties.legacyStatus`
- on an **operation**, paths are rooted at operation HTTP metadata, for example `responses.200.body.properties.legacyStatus`
- on an **interface** or **namespace**, paths may identify a removed operation directly by its operation identity

#### Why parent placement is required for removed nodes

Removed declarations are often expressed in TypeSpec with `@removed(...)`.
Those declarations may still appear in source, but they are projected out of the target version.
The breaking change tool compares the projected old and new graphs.
If a node does not exist in the new projection, any decorator attached directly to that removed node disappears with it.

That is why removed elements cannot reliably carry their own approvals.
The approval must be attached to a declaration that still exists in the target version:

- model for a removed property
- interface or namespace for a removed operation
- enum for a removed enum value
- operation for inline response/request metadata changes

Parent placement preserves approval visibility even when the exact changed node is gone.

### 6.3 Detecting New Suppressions for Review

Suppressing a breaking change is itself a reviewable action.
The CI workflow therefore compares suppressions in the base branch and head branch to determine whether the PR introduced any new or modified approvals.

The mechanism is straightforward:

- compile the base branch
- compile the head branch
- collect all `@approvedBreakingChange` and `@approvedUnversionedChange` decorators from each compilation
- compare them by declaration identity and decorator kind

For each suppression decorator instance in head:

1. find the same node in base using identity matching
2. compare the suppression metadata on that node
3. classify the result

The classification rules are:

- **NEW**: base has no matching suppression decorator; head does
- **EXISTING**: base and head have the same suppression decorator
- **REMOVED**: base had the suppression decorator; head removed it
- **MODIFIED**: both have a suppression decorator, but the metadata differs

Identity matching uses the same model the suppression system already relies on:

- direct declaration identity for direct placement
- ancestor identity plus `path` for parent placement

Metadata comparison includes the fields that matter for review, especially:

- decorator kind
- `DiffKind`
- `path`
- `since`
- `reason`

The CI semantics are intentionally conservative:

- **new approvals** require breaking change reviewer approval (via the appropriate PR label)
- **modified approvals** require re-review from the breaking change reviewer
- **existing approvals** do not require a new review
- **removed approvals** are either cleanup or will result in unsuppressed breaking changes and do not require a separate review gate

The CI workflow detects new or modified instances of both suppression decorators:

- If new or modified `@approvedBreakingChange` instances are detected, the `BreakingChangeReviewRequired` label is added.
- If new or modified `@approvedUnversionedChange` instances are detected, the `VersioningReviewRequired` label is added.

Additionally:

- Any Phase A violations not suppressed by `@approvedUnversionedChange` metadata add the `VersioningReviewRequired` label.
- Any Phase B violations not suppressed by `@approvedBreakingChange` metadata add the `BreakingChangeReviewRequired` label.

This keeps two review questions separate but visible in the same PR:

1. **Did the PR introduce a breaking change?**
2. **Did the PR also introduce or change a suppression for that breaking change?**

### 6.4 How Suppressions Are Surfaced to Reviewers

The tool surfaces both the overall suppression summary and the exact approvals that need attention.
A reviewer should be able to see, from the PR comment alone, whether the suppression state is unchanged or whether the PR is asking for new approval authority.

#### Phase B Output (Implemented)

Phase B reports use the same structured format as Phase A, with unsuppressed and suppressed sections grouped by version pair. Suppression hints use `@approvedBreakingChange` and the report title defaults to "Breaking Change Analysis".

**Unsuppressed findings:**

```markdown
## Breaking Change Analysis

❌ **1 unsuppressed breaking change detected**

1 unsuppressed · 2 version pairs compared

### Unsuppressed Breaking Changes

#### v2024-01-01 → v2025-01-01

| Kind | Identity | Suppression |
|------|----------|-------------|
| [ResourcePropertyRemoved](link) | [DELETE .../bars/{}](link) `body.properties.legacyStatus` | `@approvedBreakingChange("ResourcePropertyRemoved", { path: "properties.legacyStatus", reason: "<your reason>" })` |

<details>
<summary>Suppression examples</summary>

**ResourcePropertyRemoved (legacyStatus):**
```diff
+ @approvedBreakingChange("ResourcePropertyRemoved", { path: "properties.legacyStatus", reason: "<your reason>" })
  model BarProperties {
```

</details>
```

**Suppressed findings:**

```markdown
## Breaking Change Analysis

⚠️ **1 new suppressed breaking change** — review required

0 unsuppressed · 1 suppressed · 2 version pairs compared

### New Suppressed Breaking Changes

The following breaking changes have suppression decorators.
Reviewers should verify these changes are intentional and properly justified.

#### v2024-01-01 → v2025-01-01

| Kind | Identity | Reason |
|------|----------|--------|
| [ResourcePropertyRemoved](link) | [DELETE .../bars/{}](link) `body.properties.legacyStatus` | Removed after deprecation period |
```

**No findings:**

```markdown
## Breaking Change Analysis

✅ **No cross-version breaking changes found**

0 unsuppressed · 2 version pairs compared
```

**Version Comparisons (collapsible detail):**

Both Phase A and Phase B reports include a collapsible "Version Comparisons" section showing all pairs analyzed:

```markdown
<details>
<summary>Version Comparisons</summary>

| Service | Version Pair | Phase | Result |
|---------|-------------|-------|--------|
| Contoso.Management | v2024-01-01 (base → head) | same-version | ❌ 1 error |
| Contoso.Management | v2024-01-01 → v2025-01-01 | cross-version | ✅ No breaking changes |

</details>
```

#### Phase A Output (Implemented)

Phase A reports use the same structured format as Phase B, with unsuppressed and suppressed sections grouped by version pair. The key differences are: the report title defaults to "Versioning Change Analysis", the source links point to the head branch (not a version pair), and suppression hints use `@approvedUnversionedChange` instead of `@approvedBreakingChange`.

**Unsuppressed findings:**

```markdown
## Versioning Change Analysis

❌ **1 unsuppressed breaking change detected**

1 unsuppressed · 1 version pair compared

### Unsuppressed Breaking Changes

#### v2024-01-01 (base → head)

| Kind | Identity | Suppression |
|------|----------|-------------|
| [ResourcePropertyRemoved](link) | [DELETE .../widgets/{}](link) `body.properties.city` | `@approvedUnversionedChange("ResourcePropertyRemoved", { path: "city", reason: "<your reason>" })` |

<details>
<summary>Suppression examples</summary>

**ResourcePropertyRemoved (city):**
```diff
+ @approvedUnversionedChange("ResourcePropertyRemoved", { path: "city", reason: "<your reason>" })
  model WidgetProperties {
```

</details>
```

**Suppressed findings:**

```markdown
## Versioning Change Analysis

⚠️ **1 new suppressed breaking change** — review required

0 unsuppressed · 1 suppressed · 1 version pair compared

### New Suppressed Breaking Changes

The following breaking changes have suppression decorators.
Reviewers should verify these changes are intentional and properly justified.

#### v2024-01-01 (base → head)

| Kind | Identity | Reason |
|------|----------|--------|
| [ResourcePropertyRemoved](link) | [DELETE .../widgets/{}](link) `body.properties.city` | Removed after deprecation period |
```

**No findings:**

```markdown
## Versioning Change Analysis

✅ **No unversioned changes found**

0 unsuppressed · 1 version pair compared
```

Note that Phase A findings use `Resource*` kinds (e.g., `ResourcePropertyRemoved`) when the same property appears in both request and response contexts, because the post-processing pipeline merges `Request*` + `Response*` findings before reporting. Suppression hints include `path:` when the finding targets a removed property, directing authors to place the decorator on the surviving parent model.

This reporting format keeps the reason, the before/after links, and the suggested suppression visible in one place.
It means authors do not need to reconstruct the right `DiffKind`, path syntax, or placement rule from memory.

In practice, this reviewer experience closes the loop:

- the diff engine detects the breaking change
- the reporting layer explains the finding
- the suggestion shows how to approve it
- the approval-diff logic determines whether that approval is new or existing
- the PR label enforces final reviewer sign-off when needed

### 6.5 Stale Approvals

Approvals can outlive the changes they were meant to justify.
A property may be restored, a constraint may be relaxed again, or a declaration may be refactored so the old approval no longer matches any finding.
When that happens, the approval becomes stale.

The tool audits approvals as part of normal analysis.
If an `@approvedBreakingChange` decorator does not match any current Phase B finding, or an `@approvedUnversionedChange` decorator does not match any current Phase A finding, it is reported as a diagnostic rather than silently ignored.

Stale approvals are surfaced as hygiene issues:

- they do **not** block the PR by default
- they appear in reporting as cleanup candidates
- they make future reviews harder if left behind

The tool also provides a codefix to remove them.
In editor or CI-assisted workflows, the author can accept the suggested removal instead of editing the file manually.

The intended lifecycle is simple:

1. approval matches a real finding and is active
2. the spec evolves and the finding disappears
3. the approval no longer matches anything
4. the tool reports a diagnostic
5. the author removes the stale approval using the codefix

This keeps the inline suppression record accurate over time.

### 6.6 Version Scoping

By default, an unscoped `@approvedBreakingChange` covers **one** stable-to-stable transition for a given `(DiffKind, identity-path)`.
That works well for the common case where a breaking change happens once and then persists unchanged.

However, some APIs oscillate.
A property may be removed, later re-added, and then removed again.
If approvals were never version-scoped, the old approval could accidentally suppress the later removal even though it represents a new product decision.

That is why the design allows version scoping with `since:`.
The basic rule is:

- an unscoped approval is valid when it matches exactly one distinct stable baseline
- if the same `(DiffKind, identity-path)` fires against multiple distinct baselines, version-scoped approvals are required

Example scenario:

```text
v2023-01-01: legacyStatus exists
v2024-01-01: legacyStatus removed  -> approval added
v2025-01-01: legacyStatus re-added
v2026-01-01: legacyStatus removed again
```

The first removal and the second removal are not the same review event.
They happen in different stable transitions.
If both produce `ResponsePropertyRemoved` for the same identity-path, the tool treats the old unscoped approval as ambiguous.
The later finding is then reported as unsuppressed until the approval is split.

Version-scoped replacements look like this:

```typespec
@approvedBreakingChange(
  "ResponsePropertyRemoved",
  {
    since: Versions.v2024_01_01,
    path: "properties.legacyStatus",
    reason: "Initial removal after deprecation",
  }
)
@approvedBreakingChange(
  "ResponsePropertyRemoved",
  {
    since: Versions.v2026_01_01,
    path: "properties.legacyStatus",
    reason: "Removed again after temporary restoration",
  }
)
model BarProperties {
  name: string;
}
```

With `since:`, each approval is tied to a specific introducing version.
That prevents reuse across unrelated future transitions and preserves the review history accurately.

## 7. Design Decisions for Detailed Design

The following items are resolved in direction but require precise contracts during detailed design and implementation.

### 7.1 Graph walker interface contract (`CanonicalTypeNode`)

The comparison engine depends on simultaneous graph walking of canonicalized type information.
To make that reliable and testable, the tool needs a precise abstraction for what the walker consumes.

Decisions to make:

- What properties every canonical node must expose
- How child traversal works across models, unions, enums, and scalars
- How source locations are attached to canonical nodes
- How identity is represented for visited-set tracking and cycle detection
- How mock canonical nodes can be built for unit tests without compiling a full spec

### 7.2 Scalar transition table scope for v1

Should the tool implement the full scalar transition table in v1, or flag all type changes uniformly and refine classification incrementally?

The full table provides better developer experience (distinguishing widening from format changes) but creates a larger correctness surface. A narrower first release may be safer if the team cannot validate every scalar family adequately.

### 7.3 Wildcard paths for bulk suppression

The current design assumes **exact path matching only** for `@approvedBreakingChange` and `@approvedUnversionedChange`.
That keeps suppression semantics predictable, but it may be verbose when a PR intentionally removes or changes many related fields at once.

The exact-match model is safer for v1. Whether to support glob or wildcard paths is deferred to post-v1 based on ergonomic feedback.

### 7.4 Performance at scale

Performance is a practical concern because the design requires multiple expensive steps: compiling base and head, running version projections, canonicalizing operations, walking type graphs, and matching findings to approvals.

That raises some unknowns:

- whether compilation or canonicalization dominates runtime
- how much repeated work can be cached across comparisons
- whether approval matching becomes expensive with many suppression paths — the mitigation for this would be limiting the number of versions introduced in a PR

Recursive type graphs are handled by caching: once we encounter a type already compared in the same context (request or response), we use the cached result. This prevents comparison loops and is required for correctness in v1.

What remains open is the exact scaling curve and which optimizations and restrictions are required for acceptable CI latency.

> **Prototype result:** Performance testing on real Azure specs answered these questions — see Section 8.8 and `PROTOTYPE-EVALUATION.md` (Q8) for measured benchmarks.

## 8. Implementation Architecture (Prototype)

This section documents the actual implementation in `packages/typespec-breaking-change`.

### 8.1 Post-Processing Pipeline

After all comparison pairs have produced raw findings, the orchestrator applies a post-processing pipeline in strict order:

```text
raw findings ── deduplicateBySourceType ── mergeRequestResponseToResource ── collapsePhaseADuplicates ── applySuppressions ── resolveHeadSourceLocations ── report
```

1. **`deduplicateBySourceType`** — Removes duplicate findings that arise when the same source type appears in multiple operations (e.g., a shared model used in both GET and PUT).
2. **`mergeRequestResponseToResource`** — When the same property appears in both request and response diffs, merges `RequestPropertyRemoved` + `ResponsePropertyRemoved` into a single `ResourcePropertyRemoved` finding (and similarly for other Request/Response pairs).
3. **`collapsePhaseADuplicates`** — In Phase A, the same change can fire across multiple version pairs. This step keeps only one representative finding per unique change.
4. **`applySuppressions`** — Matches findings against `@approvedBreakingChange` / `@approvedUnversionedChange` decorators. **Must run after merge** so that `ResourcePropertyRemoved` suppressions match merged findings.
5. **`resolveHeadSourceLocations`** — Resolves source links for cross-compilation findings (Phase A). Uses the unmutated head program to determine whether a type exists in head source.

> **Critical ordering constraint:** Suppressions must run after Resource merge. Users write suppressions using `Resource*` kind names (which is what they see in reports), but before merge the findings still have `Request*`/`Response*` kinds. For backward compatibility, `matchesKind` also accepts `Request*`/`Response*` as aliases for `Resource*` findings.

### 8.2 Source Link Resolution

The tool now resolves each finding through a six-level source chain and returns `ResolvedLocation { location, sourceTraceLevel, elementPath? }`, where `SourceTraceLevel = "direct" | "origin" | "base" | "parentModel" | "operation" | "namespace"`.

`resolveFindingLocation()` applies the following priority order:
1. `headSourceLocation`
2. `origin.sourceLocation`
3. `baseSourceLocation`
4. parent-type fallback (`resolveTypeLocationWithModelFallback`)
5. `operationSourceLocation`
6. service namespace source location + `elementPath`

For same-program diffs, `headSourceLocation` usually comes directly from the compiler. For cross-compilation findings, `resolveHeadSourceLocations()` runs after suppression and before reporting. It looks up the affected declaration in the unmutated HEAD program by AST source name (`prop.node?.parent?.id?.sv`), first by origin declaration path, then in the matching service namespace, then globally. This scoped lookup avoids ambiguous same-name models while still recovering links for projected or copied types.

The guiding rule is: **link to HEAD when the declaration still exists in HEAD source; link to the parent model only when the declaration is truly deleted**. Accordingly, `resolveHeadSourceLocations()` sets `headSourceLocation` to the property when it still exists and to the model when only the parent survives, recording `headSourceTraceLevel` on `ApiDiff` so downstream suppression guidance can choose between direct decoration and parent-model-with-path decoration.

Origin tracing in `src/diff/origin.ts` complements this by recovering declaration-scoped anchors for deduplication and suppression. In addition to `sourceProperty` chains and canonical-property tracing, it follows template-instantiation metadata (`sourceModels` and `templateMapper.args`) so template-generated properties resolve back to the named source declaration (the B5 fix).

Measured on real ARM specs, this produced **92.3%** origin coverage on Network, **88.6%** on fleet, and **100%** source-link resolution in both evaluated Phase B specs.

### 8.3 Cross-Compilation Suppression Identity

TypeSpec state maps use object identity — types from different compilations never match. This means decorator metadata from the base compilation cannot be directly looked up for types in the head compilation.

The suppression system handles this with two strategies:
- **Head-program lookup (primary):** For Phase A suppressions using `@approvedUnversionedChange`, the tool reads suppression metadata from the head program's type graph since that's where authors add decorators.
- **`scanUnversionedSuppressions` fallback:** Scans the head program's namespace tree for all types carrying suppression decorators, building a map keyed by `(namespace.modelName.propertyName, diffKind)` for cross-compilation matching.

### 8.4 Resource Merge

ARM-style resources typically use a `properties` model that appears in both request bodies and response bodies via `spread`. When a property is removed from such a model, the diff engine reports both `RequestPropertyRemoved` and `ResponsePropertyRemoved` for the same underlying change.

`mergeRequestResponseToResource` detects these pairs (same operation, same property path, complementary Request/Response kinds) and replaces them with a single `Resource*` finding. This matches user expectations — they see one finding for one change — and aligns with how suppressions are authored.

### 8.5 Phase A → Phase B Interaction

When Phase A detects changes in an existing version, that version is also fed into Phase B analysis. This ensures that if a PR modifies an existing version (not just adds a new one), the cross-version evolution check still runs.

```ts
const changedVersions: string[] = []; // populated by Phase A
// ...
const candidates = [...new Set([...changedVersions, ...newVersions])];
const phaseBPairs = buildPhaseBPairs(headService.versions, candidates);
```

### 8.6 Library Registration

The tool is both a standalone CLI and a TypeSpec library (providing suppression decorators). Library registration requires:

- `exports` field in `package.json`: `{ ".": { "typespec": "./lib/main.tsp", "default": "./src/index.js" } }`
- Without this, `extern dec` declarations are found but JS implementations are not loaded ("Unknown decorator" error).
- Specs using the library need `using Azure.BreakingChange;` for unqualified decorator names.

### 8.7 Module Structure

| File | Responsibility |
|------|---------------|
| `orchestrator.ts` | Top-level analysis pipeline, pair selection, post-processing |
| `diff-engine.ts` | Structural graph walking, produces raw diffs |
| `diff-operations.ts` | Operation-level comparison (params, bodies, responses) |
| `diff-types.ts` | Type-level recursive comparison |
| `policy.ts` | Phase A/B classification rules |
| `suppression.ts` | Decorator matching, cross-compilation identity |
| `resolve-location.ts` | Source link resolution, head program lookup |
| `versions.ts` | Version enumeration, pair construction |
| `canonicalize.ts` | Adapter to `@typespec/http-canonicalization` |
| `operation-identity.ts` | Stable identity (method + normalized path) |
| `reporter-*.ts` | Output formatters (console, markdown, JSON, GitHub) |
| `cli.ts` | CLI entry point |
| `decorators.ts` | Decorator JS implementations |
| `lib/decorators.tsp` | Decorator TSP declarations and option models |

### 8.8 Performance Results

Performance was validated on real Azure specs during prototype evaluation. All benchmarks measure analysis time only (excluding initial TypeSpec compilation).

| Spec | Operations | Versions | Pairs | Analysis Time |
|------|-----------|----------|-------|---------------|
| AppConfiguration | 29 | 3 (preview) | 0 | **0s** |
| ContainerService/fleet | 12–42 | 13 (3 stable + 10 preview) | 8 | **8.4s** |
| Network | 739 | 2 (stable) | 1 | **7.0s** |

**Findings:**
- All specs complete well under the 60-second CI budget (7x margin).
- Bottleneck split: version mutator application (~50%), diff engine comparison (~45%), classification/suppression (~5%).
- Scaling is linear with `operations × version_pairs`. Per-view mutator cost is ~180ms.
- No parallelization or caching optimizations needed at current scale.
- Integration tests enforce `expect(timing.totalMs).toBeLessThan(30_000)`.

For full details, see `PROTOTYPE-EVALUATION.md` (Q8) and `typespec-breaking-change-test-coverage.md` (Section 7).
