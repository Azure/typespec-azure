# Breaking Change Classification

## Purpose

This document defines how detected API diffs are classified by the policy layer. The diff engine always returns ALL observable diffs (see `diff-taxonomy.md`). The policy layer then classifies each diff by severity (ignore, informational, warning, error). In breaking change detection, only two severities are used (error, ignore):

- **Error**: The change is breaking and must be approved or corrected.
- **Ignore**: The change is not breaking and is not surfaced in the default report.

The diff engine is exhaustive and context-neutral — it always produces the complete `ApiDiff[]`. The policy layer filters what is reported to the user, and the default report surfaces only Errors. Non-breaking diffs remain available for other consumers (changelog generation, debugging via `--dump-all-diffs`, suppression validation).

## Severity Model

| Phase                                      | Breaking diffs | Non-breaking diffs |
| ------------------------------------------ | -------------- | ------------------ |
| Phase A (same-version regression)          | Error          | Error              |
| Phase B (cross-version vs previous stable) | Error          | Ignore             |

In Phase A, every diff is an error because modifying an existing api-version requires a new version. In Phase B, only breaking changes are reported; non-breaking evolution is expected and ignored.

## Rule Evaluation

Rules are evaluated by specificity. When a diff matches multiple rules, the most specific match applies. The diff engine recognizes TypeSpec decorators like `@renamedFrom` and `@typeChangedFrom` and produces specialized DiffKinds (e.g., `RequestParameterRenamed`) rather than redundant remove+add pairs. This prevents double-reporting for what is a single atomic change in TypeSpec source.

The cost of recognizing these decorators is minimal — it requires checking the presence of decorator metadata during graph walking, which adds negligible overhead compared to the graph traversal itself.

## Phase A: Same-Version Regression

**Rule:** Any detected diff on an existing api-version is an Error.

```
ALL DiffKinds → Error
```

No exceptions. If the diff engine produces any `ApiDiff` for a version that exists in both base and head, it is an error.

## Phase B: Cross-Version Breaking Changes

The following sections define which diffs are breaking (Error) when comparing a version against the previous stable version. Any diff not listed here is Ignored.

### Service-Level Breaking Changes

| DiffKind                                           | Rule Name             | Why it's breaking                                     |
| -------------------------------------------------- | --------------------- | ----------------------------------------------------- |
| `ApiVersionRemoved`                                | `RemovedApiVersion`   | Clients targeting that version can no longer reach it |
| `AuthSchemeRemoved`                                | `RemovedAuthScheme`   | Clients using that auth method are rejected           |
| `AuthSchemeAdded` (when it adds a new requirement) | `AddedRequiredAuth`   | Clients must now satisfy additional auth              |
| `OAuthScopeAdded`                                  | `NarrowedOAuthScopes` | Existing tokens may lack the new scope                |

### Operation-Level Breaking Changes

| DiffKind                | Rule Name         | Why it's breaking                    |
| ----------------------- | ----------------- | ------------------------------------ |
| `OperationRemoved`      | `RemovedEndpoint` | All callers break                    |
| `OperationRouteChanged` | `RemovedEndpoint` | Equivalent to removing the old route |

### Request Breaking Changes

#### Parameters

| DiffKind                                                                                     | Rule Name                       | Why it's breaking                                                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `RequestPathParameterAdded` / `RequestQueryParameterAdded` / `RequestHeaderAdded` (required) | `AddedRequiredRequestParameter` | Existing requests missing this parameter are rejected                                                 |
| `RequestPathParameterRemoved` / `RequestQueryParameterRemoved` / `RequestHeaderRemoved`      | `RemovedRequestParameter`       | Clients still sending it get unexpected behavior                                                      |
| `RequestParameterRenamed`                                                                    | `RenamedRequestParameter`       | Old name no longer accepted                                                                           |
| `RequestParameterMadeRequired`                                                               | `ParameterMadeRequired`         | Clients that omit it now fail                                                                         |
| `RequestParameterLocationChanged`                                                            | `ParameterLocationChanged`      | Clients send value to wrong place (e.g., moved from header to query parameter, or from query to path) |
| `RequestParameterDefaultChanged`                                                             | `ParameterDefaultChanged`       | Server interprets omitted values differently                                                          |

#### Request Body

| DiffKind                          | Rule Name                      | Why it's breaking                                |
| --------------------------------- | ------------------------------ | ------------------------------------------------ |
| `RequestPropertyAdded` (required) | `AddedRequiredRequestProperty` | Existing request bodies are rejected             |
| `RequestPropertyRemoved`          | `RemovedRequestProperty`       | Clients still sending it get unexpected behavior |
| `RequestPropertyRenamed`          | `RenamedRequestProperty`       | Old property name no longer accepted             |
| `RequestPropertyMadeRequired`     | `PropertyMadeRequired`         | Clients that omit it now fail                    |
| `RequestPropertyDefaultChanged`   | `PropertyDefaultChanged`       | Server interprets missing values differently     |
| `RequestPropertyTypeNarrowed`     | `RequestPropertyTypeNarrowed`  | Accepts fewer values; existing payloads rejected |

#### Request Type Changes

| DiffKind                        | Rule Name                   | Why it's breaking                                                                                                                                                   |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RequestTypeChanged`            | `RequestTypeChanged`        | Incompatible wire format; existing payloads rejected                                                                                                                |
| `RequestTypeNarrowed`           | `RequestTypeNarrowed`       | Accepts fewer values; some existing payloads rejected                                                                                                               |
| `RequestTypeKindChanged`        | `RequestTypeKindChanged`    | Model→Array, Record→Model, etc. — wire shape incompatible                                                                                                           |
| `RequestEncodingChanged`        | `RequestEncodingChanged`    | Parameter or payload serialization changed (for example csv↔pipes↔multi / Swagger 2.0 `collectionFormat` equivalent); existing encoded values may be misinterpreted |
| `RequestConstraintStrengthened` | `ConstraintStrengthened`    | Previously valid values now rejected                                                                                                                                |
| `RequestContentTypeRemoved`     | `RemovedRequestContentType` | Clients using that content type are rejected                                                                                                                        |

Note: `RequestTypeWidened` is Ignore — accepting more values is not breaking.

### Response Breaking Changes

#### Response Properties

Note: An operation may have multiple responses distinguished by status code (success responses and error responses). `ResponseStatusCodeAdded` means a new status code variant is introduced that clients must handle. `ResponseTypeChanged` applies per status-code response — if the body type of an existing status code response changes, that is a separate rule from adding an entirely new status code.

| DiffKind                       | Rule Name                      | Why it's breaking                                            |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------ |
| `ResponsePropertyRemoved`      | `RemovedResponseProperty`      | Clients reading this property get undefined/null             |
| `ResponsePropertyRenamed`      | `RenamedResponseProperty`      | Clients reading old name get nothing                         |
| `ResponsePropertyMadeOptional` | `ResponsePropertyMadeOptional` | Clients assuming non-null will fail                          |
| `ResponsePropertyTypeWidened`  | `ResponsePropertyTypeWidened`  | More possible values; clients with exhaustive handling break |

Note: `ResponsePropertyMadeRequired` is Ignore — it provides stronger guarantees to clients.

Note: `ResponsePropertyAdded` is Ignore — well-behaved clients ignore unknown fields.

#### Response Type Changes

| DiffKind                  | Rule Name                 | Why it's breaking                                            |
| ------------------------- | ------------------------- | ------------------------------------------------------------ |
| `ResponseTypeChanged`     | `ResponseTypeChanged`     | Incompatible wire format; clients parse incorrectly          |
| `ResponseTypeWidened`     | `ResponseTypeWidened`     | More possible values; clients with exhaustive handling break |
| `ResponseTypeKindChanged` | `ResponseTypeKindChanged` | Model→Array, Record→Model, etc. — wire shape incompatible    |
| `ResponseEncodingChanged` | `ResponseEncodingChanged` | Clients decoding with old format get garbage                 |

Note: `ResponseTypeNarrowed` is Ignore — returning fewer values is not breaking.

#### Response Structure

| DiffKind                     | Rule Name                    | Why it's breaking                                            |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `ResponseStatusCodeAdded`    | `AddedResponseStatusCode`    | Clients must handle a new status code they weren't expecting |
| `ResponseStatusCodeRemoved`  | `RemovedResponseStatusCode`  | Clients handling this status code never see it               |
| `ResponseContentTypeAdded`   | `AddedResponseContentType`   | Clients must handle a new media type                         |
| `ResponseContentTypeRemoved` | `RemovedResponseContentType` | Clients expecting that format can't parse response           |
| `ResponseHeaderRemoved`      | `RemovedResponseHeader`      | Clients reading this header get nothing                      |

#### Error Responses

| DiffKind               | Rule Name              | Why it's breaking                                    |
| ---------------------- | ---------------------- | ---------------------------------------------------- |
| `ErrorResponseAdded`   | `AddedErrorResponse`   | Clients must handle a new error status code          |
| `ErrorResponseRemoved` | `RemovedErrorResponse` | Clients handling this error status code never see it |

### Model and Type Breaking Changes

#### Model Shape

TypeSpec models represent three distinct wire shapes:

1. **Models with properties** — Objects with named fields. Property-level changes are compared individually.
2. **Arrays** — Models with an indexer keyed by `integer`. Changes to the item type are recursively processed.
3. **Records** — Models with an indexer keyed by `string`. Changes to the value type are recursively processed.

A change between these shapes (e.g., Model→Array, Record→Model) is always breaking and produces `RequestTypeKindChanged` or `ResponseTypeKindChanged`.

#### Type Kind Changes

| DiffKind                         | Rule Name         | Why it's breaking                        |
| -------------------------------- | ----------------- | ---------------------------------------- |
| `TypeKindChanged` (Model→Array)  | `TypeKindChanged` | Completely different wire shape          |
| `TypeKindChanged` (Model→Record) | `TypeKindChanged` | Named properties become arbitrary keys   |
| `TypeKindChanged` (Array→Model)  | `TypeKindChanged` | Collection becomes object                |
| `TypeKindChanged` (Array→Record) | `TypeKindChanged` | Ordered collection becomes key-value map |
| `TypeKindChanged` (Record→Model) | `TypeKindChanged` | Arbitrary keys become named properties   |
| `TypeKindChanged` (Record→Array) | `TypeKindChanged` | Key-value map becomes ordered collection |

For Arrays: changes to the item type are recursively processed using the same rules.
For Records: changes to the value type are recursively processed using the same rules.

#### Enum Changes

All enums in TypeSpec are closed.

| DiffKind                        | Rule Name          | Why it's breaking                                           |
| ------------------------------- | ------------------ | ----------------------------------------------------------- |
| `EnumValueRemoved` (in request) | `RemovedEnumValue` | Existing requests using that value are rejected             |
| `EnumValueAdded` (in response)  | `AddedEnumValue`   | Clients with exhaustive match/switch break on unknown value |

Note: `EnumValueRemoved` in a response context is Ignore — returning fewer values is not breaking.

Note: `EnumValueAdded` in a request context is Ignore — the server accepts more values.

#### Scalar/Built-in Type Changes

Scalar type changes are covered by `RequestTypeChanged`/`ResponseTypeChanged` and `RequestTypeNarrowed`/`ResponseTypeNarrowed`/`ResponseTypeWidened`. These apply when the underlying scalar type changes (e.g., `int32`→`string`, `url`→`plainDate`).

#### Union Changes

Unions come in two forms:

**Closed unions** (finite set of known variants):

| DiffKind                           | Rule Name             | Why it's breaking                                 |
| ---------------------------------- | --------------------- | ------------------------------------------------- |
| `UnionVariantRemoved` (in request) | `RemovedUnionVariant` | Existing requests using that variant are rejected |
| `UnionVariantAdded` (in response)  | `AddedUnionVariant`   | Clients with exhaustive handling break            |

Note: `UnionVariantAdded` in a request context is Ignore for closed unions — the server accepts more variants.

Note: `UnionVariantRemoved` in a response context is Ignore for closed unions — returning fewer variants is not breaking.

**Open unions** (extensible, expect unknown variants):

Open unions treat both adding and removing named variants as Ignore because the base scalar already allows unknown values.

#### Discriminator Changes

| DiffKind               | Rule Name              | Why it's breaking                  |
| ---------------------- | ---------------------- | ---------------------------------- |
| `DiscriminatorChanged` | `DiscriminatorChanged` | Polymorphic deserialization breaks |

### Constraint Changes (Request)

| DiffKind                        | Rule Name                | Why it's breaking                    |
| ------------------------------- | ------------------------ | ------------------------------------ |
| `RequestConstraintStrengthened` | `ConstraintStrengthened` | Previously valid values now rejected |

Note: `RequestConstraintRelaxed` is Ignore — the server accepts more values.

### Constraint Changes (Response)

| DiffKind                    | Rule Name           | Why it's breaking                              |
| --------------------------- | ------------------- | ---------------------------------------------- |
| `ResponseConstraintRelaxed` | `ConstraintRelaxed` | Clients may not handle broader range of values |

Note: `ResponseConstraintStrengthened` is Ignore — clients receive tighter guarantees.

## Suppressions

Suppressions acknowledge a diff. Two decorators provide phase-specific suppression:

- `@approvedBreakingChange` — suppresses Phase B breaking changes. Placed on the affected type or its parent.
- `@approvedUnversionedChange` — suppresses Phase A same-version regressions. Placed on the affected type or its parent.

Each decorator writes to a separate metadata key in the type graph. The policy layer only consults the relevant decorator for each phase, preventing a Phase B approval from accidentally suppressing a Phase A violation.

## Complete Rule Index

| Rule Name                       | DiffKind(s)                                                                                  | Direction |
| ------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| `AddedEnumValue`                | `EnumValueAdded`                                                                             | Response  |
| `AddedErrorResponse`            | `ErrorResponseAdded`                                                                         | Response  |
| `AddedRequiredAuth`             | `AuthSchemeAdded`                                                                            | Service   |
| `AddedRequiredRequestParameter` | `RequestPathParameterAdded` / `RequestQueryParameterAdded` / `RequestHeaderAdded` (required) | Request   |
| `AddedRequiredRequestProperty`  | `RequestPropertyAdded` (required)                                                            | Request   |
| `AddedResponseContentType`      | `ResponseContentTypeAdded`                                                                   | Response  |
| `AddedResponseStatusCode`       | `ResponseStatusCodeAdded`                                                                    | Response  |
| `AddedUnionVariant`             | `UnionVariantAdded` (closed, response)                                                       | Response  |
| `ConstraintRelaxed`             | `ResponseConstraintRelaxed`                                                                  | Response  |
| `ConstraintStrengthened`        | `RequestConstraintStrengthened`                                                              | Request   |
| `DiscriminatorChanged`          | `DiscriminatorChanged`                                                                       | Model     |
| `NarrowedOAuthScopes`           | `OAuthScopeAdded`                                                                            | Service   |
| `ParameterDefaultChanged`       | `RequestParameterDefaultChanged`                                                             | Request   |
| `ParameterLocationChanged`      | `RequestParameterLocationChanged`                                                            | Request   |
| `ParameterMadeRequired`         | `RequestParameterMadeRequired`                                                               | Request   |
| `PropertyDefaultChanged`        | `RequestPropertyDefaultChanged`                                                              | Request   |
| `PropertyMadeRequired`          | `RequestPropertyMadeRequired`                                                                | Request   |
| `RemovedApiVersion`             | `ApiVersionRemoved`                                                                          | Service   |
| `RemovedAuthScheme`             | `AuthSchemeRemoved`                                                                          | Service   |
| `RemovedEndpoint`               | `OperationRemoved`, `OperationRouteChanged`                                                  | Operation |
| `RemovedEnumValue`              | `EnumValueRemoved`                                                                           | Request   |
| `RemovedErrorResponse`          | `ErrorResponseRemoved`                                                                       | Response  |
| `RemovedRequestContentType`     | `RequestContentTypeRemoved`                                                                  | Request   |
| `RemovedRequestParameter`       | `RequestPathParameterRemoved` / `RequestQueryParameterRemoved` / `RequestHeaderRemoved`      | Request   |
| `RemovedRequestProperty`        | `RequestPropertyRemoved`                                                                     | Request   |
| `RemovedResponseContentType`    | `ResponseContentTypeRemoved`                                                                 | Response  |
| `RemovedResponseHeader`         | `ResponseHeaderRemoved`                                                                      | Response  |
| `RemovedResponseProperty`       | `ResponsePropertyRemoved`                                                                    | Response  |
| `RemovedResponseStatusCode`     | `ResponseStatusCodeRemoved`                                                                  | Response  |
| `RemovedUnionVariant`           | `UnionVariantRemoved`                                                                        | Request   |
| `RenamedRequestParameter`       | `RequestParameterRenamed`                                                                    | Request   |
| `RenamedRequestProperty`        | `RequestPropertyRenamed`                                                                     | Request   |
| `RenamedResponseProperty`       | `ResponsePropertyRenamed`                                                                    | Response  |
| `RequestEncodingChanged`        | `RequestEncodingChanged`                                                                     | Request   |
| `RequestPropertyTypeNarrowed`   | `RequestPropertyTypeNarrowed`                                                                | Request   |
| `RequestTypeChanged`            | `RequestTypeChanged`                                                                         | Request   |
| `RequestTypeKindChanged`        | `RequestTypeKindChanged`                                                                     | Request   |
| `RequestTypeNarrowed`           | `RequestTypeNarrowed`                                                                        | Request   |
| `ResponseEncodingChanged`       | `ResponseEncodingChanged`                                                                    | Response  |
| `ResponsePropertyMadeOptional`  | `ResponsePropertyMadeOptional`                                                               | Response  |
| `ResponsePropertyTypeWidened`   | `ResponsePropertyTypeWidened`                                                                | Response  |
| `ResponseTypeChanged`           | `ResponseTypeChanged`                                                                        | Response  |
| `ResponseTypeKindChanged`       | `ResponseTypeKindChanged`                                                                    | Response  |
| `ResponseTypeWidened`           | `ResponseTypeWidened`                                                                        | Response  |
| `TypeKindChanged`               | `TypeKindChanged`                                                                            | Model     |
