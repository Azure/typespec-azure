# Source Tracing Deep Dive

This document explains how source tracing works in `@azure-tools/typespec-breaking-change`, with an emphasis on the code paths a developer will touch when debugging or extending the algorithm.

## 1. Overview

Source tracing answers a simple user question: **which TypeSpec declaration should this finding link to?**

That question becomes tricky because the tool works across several shapes of compiler output:

- **Cross-compilation (Phase A)** compares a base program to a separate head program. A removed property may have no `headType`, even though the declaration still exists in the unmutated HEAD source.
- **Template and spread expansion** can produce copied properties whose runtime identity no longer points at the original named declaration.
- **Visibility filtering / HTTP canonicalization** can create projected models whose compiler-visible names differ from the AST source names users wrote.

The current design therefore uses two cooperating stages:

1. **Origin resolution** (`src/diff/origin.ts`) finds the best declaration-scoped anchor for deduplication and suppression.
2. **Location resolution** (`src/pipeline/resolve-location.ts`) chooses the best report location for each finding, preferring HEAD source when available.

The guiding rule is:

> Link to HEAD when the declaration still exists in HEAD source; link to the parent model when the declaration is truly deleted.

## 2. Origin Resolution (`src/diff/origin.ts`)

### Purpose

`resolveOrigin()` serves two jobs:

1. **Deduplication**: identical `{ origin, DiffKind }` findings across operations collapse to one logical finding.
2. **Declaration-scoped suppression**: a decorator placed on the origin declaration suppresses all uses of that declaration.

### High-level algorithm

For `ModelProperty`, the algorithm is:

1. Follow the `sourceProperty` chain to the earliest copied-from property.
2. Try to recover a template source property.
3. If the property is on a named model, try to recover the canonical property declaration.
4. If still anonymous, climb to the nearest named ancestor property/model.

For other kinds:

- `Model`, `Enum`, `Union`, `Scalar`: the named declaration is its own origin.
- `EnumMember`: the parent enum is the origin.
- `UnionVariant`: the parent union is the origin if named.

### `sourceProperty` chain

The first and cheapest trace is `followSourcePropertyChain()`. Spreads and intersections often preserve a `sourceProperty` pointer back to the original declaration, so a copied property can be traced directly to the user-authored property.

### Canonical property tracing

Visibility-filtered ARM models are the main pitfall here. HTTP canonicalization can create models such as `EmployeePropertiesCreateOrUpdate` without setting `sourceProperty`, even though the generated property still came from `EmployeeProperties`.

`traceToCanonicalProperty()` handles this by:

- taking the property's AST node,
- scanning sibling models in the same namespace,
- finding a same-named property with the same AST node,
- preferring the shorter model name as the canonical source model.

This intentionally compensates for **projected names vs AST source names**. `prop.model?.name` may reflect a projected/canonicalized model, while the AST still points at the user declaration the developer expects.

### Template tracing (`sourceModels` + `templateMapper.args`)

The B5 fix added tracing through template instantiation metadata for cases where `sourceProperty` is absent.

`traceToTemplateSourceProperty()` tries two recursive paths:

1. **`sourceModels` traversal** via `traceToTemplateSourceModel()`
2. **`templateMapper.args` traversal** via `traceToTemplateArgumentProperty()`

This matters for patterns where a property is copied through a template model or through a template argument model before appearing in the final wire shape. The algorithm:

- walks `model.sourceModels`,
- checks whether the source model directly defines the same property,
- recursively explores nested source models,
- then explores template arguments (`templateMapper.args`) that are models,
- stopping on the first property that can be traced back to a named declaration.

This is what pushed the real-spec origin rate back up on Network and fleet.

### Named ancestor climbing

If a property still lives on an anonymous model after all previous tracing, `climbToNamedAncestor()` walks upward:

`property -> anonymous model -> parent property -> parent model -> ...`

The first named property on a named model becomes the origin. This keeps inline object shapes suppressible even when the deepest member has no standalone named declaration.

## 3. Head Source Location Resolution (`resolveHeadSourceLocations()`)

### When it runs

Pipeline position:

`dedup -> merge -> collapse -> suppress -> resolveHeadSourceLocations -> report`

It runs **after suppression** and **before reporting**.

### Why it exists

Phase A compares different compilations. In that mode, `baseType` may still exist, but `headType` can be missing because:

- the property was truly deleted from HEAD source, or
- the property still exists in HEAD source but was projected out of the compared version view.

`resolveHeadSourceLocations()` distinguishes those cases by consulting the **unmutated HEAD program**.

### What it does

For findings with:

- no `headType`,
- no existing `headSourceLocation`,
- and a `baseType` that is a `ModelProperty`,

it:

1. gets the property name,
2. gets the **AST source model name** from `prop.node?.parent?.id?.sv`,
3. looks up the corresponding model in the HEAD program,
4. checks whether the property still exists on that model,
5. sets:
   - `headSourceLocation` to the property location and `headSourceTraceLevel = "direct"` if found,
   - otherwise `headSourceLocation` to the model location and `headSourceTraceLevel = "parentModel"` if only the model remains.

### Scoped lookup

Lookup order is:

1. `findModelFromOrigin()` using `origin.declarationPath`
2. `findModelInServiceNamespace()` using the matching service namespace
3. `findModelInProgram()` as a global fallback

The service-namespace-first lookup fixes the ambiguous same-name model bug: if multiple services or namespaces define `WidgetProperties`, the resolver prefers the model under the current service namespace before falling back to a global recursive search.

### Downstream effect: `headSourceTraceLevel`

`headSourceTraceLevel` is stored on `ApiDiff` for downstream consumers. The main consumer today is suppression guidance:

- `"direct"` means the element exists in HEAD and the decorator can be placed directly on it.
- `"parentModel"` means the element is gone and suppression guidance should place the decorator on the parent model with a `path`.

## 4. Finding Location Resolution (`resolveFindingLocation()`)

`resolveFindingLocation()` chooses the final report anchor and returns:

```ts
interface ResolvedLocation {
  location: SourceLocation;
  sourceTraceLevel: SourceTraceLevel;
  elementPath?: string;
}
```

Where:

```ts
type SourceTraceLevel =
  | "direct"
  | "origin"
  | "base"
  | "parentModel"
  | "operation"
  | "namespace";
```

### Decision diagram

```text
headSourceLocation?
  yes -> return direct/parentModel
  no  -> origin.sourceLocation?
            yes -> return origin
            no  -> baseSourceLocation?
                      yes -> return base
                      no  -> type fallback?
                                yes -> return direct/origin/parentModel
                                no  -> operationSourceLocation?
                                          yes -> return operation
                                          no  -> service namespace?
                                                    yes -> return namespace + elementPath
                                                    no  -> unresolved
```

### The six fallback levels

1. **`headSourceLocation`**
   - Source: diff engine for same-program findings, or `resolveHeadSourceLocations()` for cross-compilation findings.
   - Meaning: preferred user-facing HEAD anchor.
   - Trace levels returned here: usually `"direct"`, sometimes `"parentModel"`.

2. **`origin.sourceLocation`**
   - Source: `resolveOrigin()`.
   - Meaning: declaration-scoped anchor used for dedup and suppression.
   - Trace level: `"origin"`.

3. **`baseSourceLocation`**
   - Source: base compilation.
   - Meaning: last declaration-level fallback when no better HEAD-side anchor exists.
   - Trace level: `"base"`.

4. **Parent/type fallback via `resolveTypeLocationWithModelFallback()`**
   - Source: `headType ?? baseType`.
   - Meaning: salvage a useful declaration when the diff has a type reference but not a good stored location.
   - Returned trace levels:
     - `"direct"` if the type itself has a usable source location,
     - `"origin"` if a `ModelProperty.sourceProperty` chain leads to a better property declaration,
     - `"parentModel"` if the enclosing model/enum/union is the best remaining anchor.

5. **`operationSourceLocation`**
   - Source: diff classification.
   - Meaning: operation-scoped diffs such as lifecycle changes or wire-level parameter diffs with no declaration anchor.
   - Trace level: `"operation"`.

6. **Service namespace fallback**
   - Source: `finding.serviceNamespace`.
   - Meaning: final namespace-level anchor when the finding can only be tied to the service.
   - Trace level: `"namespace"`.
   - Extra data: `elementPath` is included for disambiguation.

### `resolveTypeLocationWithModelFallback()`

This helper is easy to miss but important for accuracy. It does not just fetch a location; it also classifies **why** that location was chosen.

Behavior:

- Try `getSourceLocation(type)` first.
- For `ModelProperty`, follow `sourceProperty` before giving up.
- If the property itself cannot be located, try the parent model.
- For `EnumMember`, fall back to the parent enum.
- For `UnionVariant`, fall back to the parent union.

That distinction is why the returned `traceLevel` can still be `"origin"` or `"parentModel"` even inside the generic type fallback stage.

### Namespace fallback and `elementPath`

Namespace fallback should be rare, but when it happens the returned `ResolvedLocation` includes `elementPath`. That gives downstream consumers enough context to show *which* logical member under the namespace produced the finding, even though the final file/line anchor is only the namespace declaration.

## 5. Interaction with the Pipeline

The relevant post-processing order is:

```text
dedup -> merge -> collapse -> suppress -> resolveHeadSourceLocations -> report
```

### Why resolution is after suppression

Suppression guidance needs to know whether the element still exists in HEAD. That classification depends on `headSourceTraceLevel`, which is synthesized by `resolveHeadSourceLocations()`.

Running location synthesis after suppression keeps the suppression matcher focused on type/origin identity, then enriches the surviving findings with the information the reporter needs to suggest the right decorator placement.

### Resource merge metadata preservation

`mergeRequestResponseToResource()` creates a merged `Finding` with:

- the original `Finding` spread (`...f`),
- the original `diff` spread (`...f.diff`),
- only `diff.kind` rewritten to the `Resource*` variant.

That means metadata such as `origin`, `baseSourceLocation`, `headSourceLocation`, and later `headSourceTraceLevel` survives the request/response-to-resource merge.

## 6. Evaluation Results

Results from `docs/source-tracing-evaluation.md`:

| Spec | Findings | Origin coverage | Source-link resolution | Non-direct fallbacks |
|------|---------:|----------------:|-----------------------:|----------------------|
| Network | 26 | 24 / 26 = 92.3% | 26 / 26 = 100% | 2 operation-level |
| AppConfiguration | 0 | n/a | n/a | n/a |
| ContainerService/fleet | 70 | 62 / 70 = 88.6% | 70 / 70 = 100% | 8 operation-level |

### Remaining gaps

The remaining fallbacks were not declaration-tracing failures in the usual sense:

- **Operation lifecycle diffs** (`OperationAdded`) naturally resolve at operation level because there is no property/type declaration to point at.
- **Wire-level parameter diffs** can also stop at operation level when the diff does not carry a `ModelProperty`/origin chain and the head-side type is intrinsic.

### Potential future improvements

- Preserve stronger declaration anchors for wire-level query/path/header parameter diffs.
- Expose both `selectedTraceLevel` and `hasOrigin` more prominently in reports to make regressions easier to spot.
- Add regression coverage for namespace ambiguity and template-argument tracing patterns.

## 7. Debugging Guide

### Check trace level in JSON output

Use JSON output and inspect each finding's resolved location metadata:

- `sourceTraceLevel` on the resolved/report output tells you which fallback won.
- `diff.headSourceTraceLevel` tells you how synthesized HEAD lookup classified the finding.
- `diff.origin` tells you whether declaration-scoped origin resolution succeeded even if the final selected location was HEAD-direct.

When debugging, distinguish these two questions:

1. **Did origin tracing succeed?**
2. **Which location did report rendering ultimately choose?**

Those are often different because `resolveFindingLocation()` prefers HEAD links over origin links.

### Common issues

#### Template properties resolve only to operation level

Usually means the diff never carried a declaration-backed `ModelProperty`, or template metadata was not available where expected.

Check:

- `sourceModels` on the instantiated model,
- `templateMapper.args`,
- whether the property is represented as a wire-level parameter instead of a model property.

#### Projected model names do not exist in namespace lookup

This is the classic visibility-filtered model issue. If `prop.model?.name` looks like `FooCreateOrUpdate`, but the source declaration is `Foo`, use the AST source model name from `prop.node?.parent?.id?.sv` instead.

#### Phase A removal links to the wrong declaration

Check whether `resolveHeadSourceLocations()` found:

- the property in HEAD (`"direct"`), or
- only the parent model (`"parentModel"`).

If it returned `"parentModel"` unexpectedly, inspect the service-namespace lookup and origin declaration path first.

### Adding a new fallback path

If you need to extend source tracing:

1. Decide whether the new behavior is:
   - **origin recovery** (`origin.ts`), or
   - **report-location selection** (`resolve-location.ts`).
2. Preserve the HEAD-first principle for user-facing links.
3. Return an explicit trace classification, not just a location.
4. Add cases that cover:
   - same-program findings,
   - cross-compilation findings,
   - template/spread-generated properties,
   - ambiguous same-name models across namespaces.

If the new fallback affects suppression guidance, also verify how it interacts with `headSourceTraceLevel` and parent-model path generation.
