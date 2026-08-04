# API Diff Taxonomy

## Purpose

This document enumerates every observable change the diff engine can detect between two canonical HTTP API graphs. Each change is a `DiffKind` — a typed, named category of difference.

DiffKinds carry NO severity judgment. Classification into Error or Ignore is the policy layer's job (see `breaking-change-classification.md`).

The diff engine produces a flat list of `ApiDiff` instances, each tagged with a DiffKind.

## Core Data Model

```typescript
import { SourceLocation, Type } from "@typespec/compiler";

type DiffComponent = "request" | "response" | "service";

interface ApiDiff {
  kind: DiffKind;
  path: DiffPath;
  component?: DiffComponent;
  baseValue: unknown; // value in base (undefined if added)
  headValue: unknown; // value in head (undefined if removed)
  baseSourceLocation?: SourceLocation; // TypeSpec source in base compilation
  headSourceLocation?: SourceLocation; // TypeSpec source in head compilation
  baseType?: Type; // Reference to the TypeSpec type in base
  headType?: Type; // Reference to the TypeSpec type in head
  details?: Record<string, unknown>;
}

interface DiffPath {
  operation?: string; // e.g., "GET /users/{id}" — absent for service-level diffs
  component?: DiffComponent; // absent for operation-level and model-only diffs
  statusCode?: string; // for response diffs — identifies which response
  element: string; // parameter name, property path, status code, etc.
}
```

The `component` field indicates whether the diff applies to the request direction, response direction, or the service surface. It is optional — operation-level and model-only diffs do not need a component value.

The `SourceLocation` type is imported directly from `@typespec/compiler`. It provides:

- `file: SourceFile` — the source file (with `.path` for the file path)
- `pos: number` — start position (UTF-16 code units from start of file, inclusive)
- `end: number` — end position (exclusive)

The `baseType` and `headType` fields reference the actual TypeSpec `Type` objects from the respective compilations. These enable:

- The suppression lookup (walking up the type chain for `@approvedBreakingChange` metadata)
- Source-location extraction for CI annotations
- Rich diagnostic messages that can reference the declaration

The `baseSourceLocation` and `headSourceLocation` fields use the real compiler `SourceLocation` type from `@typespec/compiler`, providing traceability back to TypeSpec source for CI annotations, PR feedback, and IDE integration.

## DiffKind Taxonomy

### Service-Level Diffs

| DiffKind            | Description                                 | Details           |
| ------------------- | ------------------------------------------- | ----------------- |
| `ApiVersionRemoved` | An API version was removed from the service |                   |
| `ApiVersionAdded`   | A new API version was added                 |                   |
| `AuthSchemeRemoved` | A supported auth scheme was removed         | `{ scheme }`      |
| `AuthSchemeAdded`   | A new auth scheme requirement was added     | `{ scheme }`      |
| `OAuthScopeRemoved` | An OAuth scope was removed from a flow      | `{ scope, flow }` |
| `OAuthScopeAdded`   | A new OAuth scope was added to a flow       | `{ scope, flow }` |

### Operation-Level Diffs

| DiffKind                | Description                               | Details                  |
| ----------------------- | ----------------------------------------- | ------------------------ |
| `OperationRemoved`      | An operation (route + method) was removed |                          |
| `OperationAdded`        | A new operation was added                 |                          |
| `OperationRouteChanged` | An operation's route template changed     | `{ basePath, headPath }` |

### Request Parameter Diffs

| DiffKind                          | Description                                      | Details                                |
| --------------------------------- | ------------------------------------------------ | -------------------------------------- |
| `RequestPathParameterAdded`       | A new path parameter was added                   | `{ name }`                             |
| `RequestPathParameterRemoved`     | A path parameter was removed                     | `{ name }`                             |
| `RequestQueryParameterAdded`      | A new query parameter was added                  | `{ name, isRequired }`                 |
| `RequestQueryParameterRemoved`    | A query parameter was removed                    | `{ name }`                             |
| `RequestHeaderAdded`              | A new request header was added                   | `{ name, isRequired }`                 |
| `RequestHeaderRemoved`            | A request header was removed                     | `{ name }`                             |
| `RequestParameterRenamed`         | A parameter was renamed (via `@renamedFrom`)     | `{ oldName, newName, location }`       |
| `RequestParameterMadeRequired`    | An optional parameter became required            | `{ name }`                             |
| `RequestParameterMadeOptional`    | A required parameter became optional             | `{ name }`                             |
| `RequestParameterDefaultChanged`  | The default value of a parameter changed         | `{ name, baseDefault, headDefault }`   |
| `RequestParameterLocationChanged` | Parameter moved (query→header, path→query, etc.) | `{ name, baseLocation, headLocation }` |

### Request Body Diffs

| DiffKind                        | Description                                           | Details                                      |
| ------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `RequestPropertyAdded`          | A new property was added to the request body          | `{ propertyPath, isRequired }`               |
| `RequestPropertyRemoved`        | A property was removed from the request body          | `{ propertyPath }`                           |
| `RequestPropertyRenamed`        | A body property was renamed (via `@renamedFrom`)      | `{ oldName, newName, propertyPath }`         |
| `RequestPropertyTypeChanged`    | A request body property type was changed incompatibly | `{ propertyPath, baseType, headType }`       |
| `RequestPropertyTypeNarrowed`   | A request body property type was narrowed             | `{ propertyPath, baseType, headType }`       |
| `RequestPropertyTypeWidened`    | A request body property type was widened              | `{ propertyPath, baseType, headType }`       |
| `RequestPropertyMadeRequired`   | An optional body property became required             | `{ propertyPath }`                           |
| `RequestPropertyMadeOptional`   | A required body property became optional              | `{ propertyPath }`                           |
| `RequestPropertyDefaultChanged` | The default value of a body property changed          | `{ propertyPath, baseDefault, headDefault }` |

### Request Type/Encoding/Constraint Diffs

| DiffKind                        | Description                                                                             | Details                                         |
| ------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `RequestTypeChanged`            | A request parameter or other non-property request element type was changed incompatibly | `{ element, baseType, headType }`               |
| `RequestTypeNarrowed`           | A request parameter or other non-property request element type was narrowed             | `{ element, baseType, headType }`               |
| `RequestTypeWidened`            | A request parameter or other non-property request element type was widened              | `{ element, baseType, headType }`               |
| `RequestTypeKindChanged`        | A request type changed structural kind (Model↔Array↔Record)                             | `{ element, baseKind, headKind }`               |
| `RequestEncodingChanged`        | Wire encoding changed (@encode)                                                         | `{ element, baseEncoding, headEncoding }`       |
| `RequestConstraintStrengthened` | A validation constraint was tightened                                                   | `{ element, constraint, baseValue, headValue }` |
| `RequestConstraintRelaxed`      | A validation constraint was loosened                                                    | `{ element, constraint, baseValue, headValue }` |
| `RequestContentTypeRemoved`     | A supported request content type was removed                                            | `{ contentType }`                               |
| `RequestContentTypeAdded`       | A new request content type was added                                                    | `{ contentType }`                               |

### Response Property Diffs

| DiffKind                       | Description                                          | Details                                            |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `ResponsePropertyAdded`        | A new property was added to a response body          | `{ propertyPath, statusCode }`                     |
| `ResponsePropertyRemoved`      | A property was removed from a response body          | `{ propertyPath, statusCode }`                     |
| `ResponsePropertyRenamed`      | A response property was renamed (via `@renamedFrom`) | `{ oldName, newName, propertyPath, statusCode }`   |
| `ResponsePropertyTypeChanged`  | A response property type was changed incompatibly    | `{ propertyPath, baseType, headType, statusCode }` |
| `ResponsePropertyTypeNarrowed` | A response property type was narrowed                | `{ propertyPath, baseType, headType, statusCode }` |
| `ResponsePropertyTypeWidened`  | A response property type was widened                 | `{ propertyPath, baseType, headType, statusCode }` |
| `ResponsePropertyMadeOptional` | A required response property became optional         | `{ propertyPath, statusCode }`                     |
| `ResponsePropertyMadeRequired` | An optional response property became required        | `{ propertyPath, statusCode }`                     |

### Response Type/Encoding/Constraint Diffs

| DiffKind                         | Description                                                                            | Details                                               |
| -------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ResponseTypeChanged`            | A response header or other non-property response element type was changed incompatibly | `{ element, baseType, headType, statusCode }`         |
| `ResponseTypeNarrowed`           | A response header or other non-property response element type was narrowed             | `{ element, baseType, headType, statusCode }`         |
| `ResponseTypeWidened`            | A response header or other non-property response element type was widened              | `{ element, baseType, headType, statusCode }`         |
| `ResponseTypeKindChanged`        | A response type changed structural kind (Model↔Array↔Record)                           | `{ element, baseKind, headKind, statusCode }`         |
| `ResponseEncodingChanged`        | Wire encoding changed for a response element                                           | `{ element, baseEncoding, headEncoding, statusCode }` |
| `ResponseConstraintStrengthened` | A response constraint was tightened                                                    | `{ element, constraint, baseValue, headValue }`       |
| `ResponseConstraintRelaxed`      | A response constraint was loosened                                                     | `{ element, constraint, baseValue, headValue }`       |

### Response Structure Diffs

| DiffKind                     | Description                                | Details                       |
| ---------------------------- | ------------------------------------------ | ----------------------------- |
| `ResponseStatusCodeRemoved`  | A documented status code was removed       | `{ statusCode }`              |
| `ResponseStatusCodeAdded`    | A new status code was added                | `{ statusCode }`              |
| `ResponseContentTypeRemoved` | A response content type was removed        | `{ contentType, statusCode }` |
| `ResponseContentTypeAdded`   | A new response content type was added      | `{ contentType, statusCode }` |
| `ResponseHeaderRemoved`      | A response header was removed              | `{ headerName, statusCode }`  |
| `ResponseHeaderAdded`        | A new response header was added            | `{ headerName, statusCode }`  |
| `ErrorResponseAdded`         | A new error response status code was added | `{ statusCode }`              |
| `ErrorResponseRemoved`       | An error response status code was removed  | `{ statusCode }`              |

### Model / Type Kind Diffs

| DiffKind               | Description                                        | Details                                               |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `TypeKindChanged`      | Model structural kind changed (Model↔Array↔Record) | `{ modelName, baseKind, headKind }`                   |
| `EnumValueRemoved`     | A value was removed from a closed enum             | `{ enumName, value }`                                 |
| `EnumValueAdded`       | A value was added to a closed enum                 | `{ enumName, value }`                                 |
| `UnionVariantRemoved`  | A variant was removed from a union                 | `{ unionName, variant }`                              |
| `UnionVariantAdded`    | A variant was added to a union                     | `{ unionName, variant, isOpenUnion }`                 |
| `DiscriminatorChanged` | The discriminator property or value changed        | `{ modelName, baseDiscriminator, headDiscriminator }` |

## Type Change Classification

Every type change is classified into one of three categories:

### Incompatible Change (`*TypeChanged`)

No subset/superset relationship exists between the old and new type. The wire representation is fundamentally different.

Examples:

- `string` → `int32`
- `utcDateTime` → `offsetDateTime`
- `utcDateTime` → `plainDate`
- `url` → `plainDate`
- Any integer ↔ any float (different wire families)

### Narrowing (`*TypeNarrowed`)

The new type accepts/produces fewer values. It is a strict subset of the old type.

Examples:

- `string` → `url` (constrained string)
- `int64` → `int32` (smaller range)
- `float64` → `float32` (less precision)

### Widening (`*TypeWidened`)

The new type accepts/produces more values. It is a strict superset of the old type.

Examples:

- `url` → `string` (unconstrained)
- `int32` → `int64` (larger range)
- `float32` → `float64` (more precision)

### Type Kind Change (`*TypeKindChanged`)

The structural kind of the type changed entirely:

- Model (named properties) ↔ Array (ordered items) ↔ Record (key-value map)

This is always incompatible regardless of direction.

## Encoding Changes

The `@encode` decorator changes wire representation. Any change to `@encode` that results in a different wire representation is detected as either `RequestEncodingChanged` or `ResponseEncodingChanged`, depending on whether the affected element is part of the request or the response. The specific scenarios below are all instances of those two DiffKinds. The only non-change is when an explicit `@encode` matches what was already the default encoding.

Example scenarios:

| Scenario                        | Example                                                                      | DiffKind                                              |
| ------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| `Rfc7231ToUnixTimestamp`        | `@encode("unixTimestamp", int32)` added to utcDateTime                       | `RequestEncodingChanged` or `ResponseEncodingChanged` |
| `Base64ToBase64Url`             | `@encode("base64url")` replaces `@encode("base64")` on bytes                 | `RequestEncodingChanged` or `ResponseEncodingChanged` |
| `Base64UrlToBase64`             | `@encode("base64")` replaces `@encode("base64url")` on bytes                 | `RequestEncodingChanged` or `ResponseEncodingChanged` |
| `DefaultToExplicitMatch`        | `@encode("base64")` added to bytes (matches default)                         | NOT a change                                          |
| `DefaultToNewEncoding`          | `@encode("base64url")` added to bytes (differs from default)                 | `RequestEncodingChanged` or `ResponseEncodingChanged` |
| `UnixTimestampPrecisionChanged` | `@encode("unixTimestamp", int64)` replaces `@encode("unixTimestamp", int32)` | `RequestEncodingChanged` or `ResponseEncodingChanged` |

## Constraints

Constraint types that can be strengthened or relaxed:

| Constraint   | Strengthened    | Relaxed         |
| ------------ | --------------- | --------------- |
| `@minLength` | Value increased | Value decreased |
| `@maxLength` | Value decreased | Value increased |
| `@minValue`  | Value increased | Value decreased |
| `@maxValue`  | Value decreased | Value increased |
| `@minItems`  | Value increased | Value decreased |
| `@maxItems`  | Value decreased | Value increased |
| `@pattern`   | Any change      | N/A             |

Note: For `@pattern`, any change is treated as a constraint strengthening (Error) because determining whether a regex is more or less restrictive is undecidable in the general case.

## DiffPath and Suppression Identity

The `DiffPath` uniquely identifies where in the API surface a change occurred.

The `DiffPath` is the same value used in `@approvedBreakingChange` and `@approvedUnversionedChange` decorators for the `path` parameter. When the policy layer checks for suppression, it matches the diff's `path` against the decorator's `path` metadata on the affected type or its ancestors. This ensures a one-to-one correspondence between detected diffs and their suppressions.

### How suppression works

Two decorators provide phase-specific suppression:

- `@approvedBreakingChange` — suppresses Phase B breaking changes
- `@approvedUnversionedChange` — suppresses Phase A same-version regressions

Each decorator places metadata directly in the TypeSpec type graph under its own state key. It does NOT resolve paths at decoration time.

When the policy layer classifies a diff, it checks whether the affected type (or its parent, for removed elements) carries the appropriate decorator's metadata matching:

- The `DiffKind` of the detected change
- The diff path (element identity)

If both match, the diff is suppressed. Phase A only checks `@approvedUnversionedChange`; Phase B only checks `@approvedBreakingChange`.

### Decorator shape

```typespec
// Direct placement (on the changed element itself)
@approvedBreakingChange("<DiffKind>", { reason: "..." })

// Parent placement (on ancestor, for removed elements or inlined types)
@approvedBreakingChange("<DiffKind>", { path: "<element-path>", reason: "..." })
```

The first positional argument is the `DiffKind`. The `path` property identifies the specific element when parent placement is used. Suppression only applies when the `DiffKind` and, when present, the `path` both match.

### Suppression placement

| Change                | Where decorator is placed | Example                                                                                            |
| --------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| Property type changed | On the property itself    | `@approvedBreakingChange("RequestPropertyTypeChanged", { reason: "..." })`                         |
| Property removed      | On the parent model       | `@approvedBreakingChange("RequestPropertyRemoved", { path: "properties.oldName", reason: "..." })` |
| Parameter removed     | On the operation          | `@approvedBreakingChange("RequestQueryParameterRemoved", { path: "filter", reason: "..." })`       |
| Operation removed     | On the service/interface  | `@approvedBreakingChange("OperationRemoved", { path: "GET /widgets/{id}", reason: "..." })`        |
| Enum value removed    | On the enum               | `@approvedBreakingChange("EnumValueRemoved", { path: "WidgetStatus.deprecated", reason: "..." })`  |

### Stability guarantees

DiffPaths are stable across:

- Refactors that don't change wire shape (renaming internal TypeSpec aliases)
- File reorganization (moving declarations between files)
- Import restructuring

DiffPaths change when:

- The operation's method or path changes
- A property's wire name changes
- A parameter's wire name changes

This means suppressions naturally expire when the thing they suppress no longer exists.

### Suppression placement for removed elements

When an element is removed (e.g., a property deleted, a parameter removed), there is no node in the head type graph to attach the decorator to. In this case, the suppression must be placed on the **parent** element:

- Removed property → decorator on the containing model
- Removed parameter → decorator on the operation
- Removed operation → decorator on the service/interface
- Removed enum value → decorator on the enum

The `path` parameter in the decorator identifies which specific removed child is being approved.

## Invariants

1. **Exhaustive**: Every wire-visible change maps to exactly one DiffKind
2. **Context-neutral**: No DiffKind implies severity
3. **Stable identity**: Each diff has a stable `DiffPath` for suppression matching
4. **Flat output**: The diff engine returns `ApiDiff[]` — no nesting or hierarchy
5. **Source-traceable**: Every diff includes TypeSpec source locations.
6. **Atomic**: Decorators like `@renamedFrom` produce single specialized DiffKinds, not redundant pairs

## Relationship to Other Documents

- `breaking-change-classification.md` — maps DiffKinds to Error/Ignore by phase
- `typespec-breaking-change-rules.md` — detailed rule definitions and type transition tables
- `typespec-breaking-change-oad-correlation.md` — correlation with OAD rules
