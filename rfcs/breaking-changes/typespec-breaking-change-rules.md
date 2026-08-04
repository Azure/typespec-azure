## 5. Breaking Change Rules (Phase B Classification)

These rules define how detected API diffs are classified in **Phase B** (cross-version comparison against previous stable). Each rule maps one or more `DiffKind` values from the diff engine to a severity.

**Important:** In Phase A (same-version regression), ALL diffs are errors regardless of kind. The named rules below apply only to Phase B classification. In Phase A, rule names serve only to provide descriptive error messages.

For the complete diff taxonomy, see `diff-taxonomy.md`. For the full classification policy including Phase A, see `breaking-change-classification.md`.

Rules are evaluated against canonical HTTP metadata.
That means the tool cares about the observable contract on the wire: operation identity, parameters, payload shapes, status codes, headers, content types, authentication, and encoded value sets.

### 5.1 Service-Level Rules

#### Removing an api-version

**Rule:** `RemovedApiVersion`

Severity: Error, except for replacing the latest preview version.

DiffKind: `ApiVersionRemoved`

❌ Removing a stable api-version breaks clients that target that contract and is always an error.
The normal exception is preview churn: replacing the most recent preview with a newer preview is allowed, while removing older previews or any stable version is not.

#### Removing an authentication scheme

**Rule:** `RemovedAuthScheme`

Severity: Error.

DiffKind: `AuthSchemeRemoved`

❌ Removing a supported authentication scheme is breaking because existing clients may only implement that scheme.
If the service no longer accepts the credential flow a client uses today, the contract has been narrowed in a way the client cannot recover from automatically.

#### Adding a required authentication scheme

**Rule:** `AddedRequiredAuth`

Severity: Error.

DiffKind: `AuthSchemeAdded`

❌ Adding a new required authentication mechanism is breaking when clients must now satisfy more than they did before.
For example, changing from “Bearer **or** API key” to “Bearer **and** extra proof” forces existing callers to change how they authenticate.

#### Narrowing OAuth scopes

**Rule:** `NarrowedOAuthScopes`

Severity: Error.

DiffKind: `OAuthScopeAdded`

❌ Adding a required OAuth scope is breaking because existing tokens may lack the new scope.
Removing a scope requirement is not breaking — existing clients continue to work with tokens that have more scopes than needed.

### 5.2 Operation Rules

#### Removing an endpoint

**Rule:** `RemovedEndpoint`

Severity: Error.

DiffKind: `OperationRemoved`, `OperationRouteChanged`

❌ Removing an endpoint is breaking because existing clients may still call it.
An operation is identified by `{method} {normalized-path}`, so removing that identity removes the callable contract.

> Operation identity is `{method} {normalized-path}`.
> A method change or path change is not a distinct mutation rule.
> The tool reports it as one removed endpoint plus one added endpoint.

### 5.3 Request Rules

#### Adding a required parameter or property

**Rule:** `AddedRequiredRequestParameter` / `AddedRequiredRequestProperty`

Severity: Error.

DiffKind: `RequestPathParameterAdded` (isRequired=true), `RequestQueryParameterAdded` (isRequired=true), `RequestHeaderAdded` (isRequired=true), `RequestPropertyAdded` (isRequired=true)

❌ Adding a required request parameter or request-body property is breaking because existing clients will not send it.
If the server now requires a new field for a request to succeed, older clients become invalid without any change on their side.

#### Removing a parameter or property

**Rule:** `RemovedRequestParameter` / `RemovedRequestProperty`

Severity: Error.

DiffKind: `RequestPathParameterRemoved`, `RequestQueryParameterRemoved`, `RequestHeaderRemoved`, `RequestPropertyRemoved`

❌ Removing a request parameter or property is breaking because existing clients may continue to send it.
If the service no longer recognizes or allows the field, previously valid requests can fail validation or be interpreted differently.

#### Changing a parameter default value

**Rule:** `ParameterDefaultChanged`

Severity: Error.

DiffKind: `RequestParameterDefaultChanged`

❌ Changing the default value of a request parameter is breaking because the server interprets omitted values differently.
Clients that relied on the old default behavior will get different results without any change on their side.

#### Changing a property default value

**Rule:** `PropertyDefaultChanged`

Severity: Error.

DiffKind: `RequestPropertyDefaultChanged`

❌ Changing the default value of a request body property is breaking for the same reason as parameter defaults.

#### Renaming a parameter

**Rule:** `RenamedRequestParameter`

Severity: Error.

DiffKind: `RequestParameterRenamed`

❌ Renaming a request parameter is breaking because the old name is no longer accepted.
The diff engine recognizes `@renamedFrom` and produces this specialized DiffKind rather than a remove+add pair.

#### Renaming a request property

**Rule:** `RenamedRequestProperty`

Severity: Error.

DiffKind: `RequestPropertyRenamed`

❌ Renaming a request body property is breaking because the old property name is no longer accepted.

#### Incompatible type change — format change

**Rule:** `RequestTypeChanged`

Severity: Error.

DiffKind: `RequestTypeChanged`

❌ A format change is always breaking for requests because the wire representation itself changes.
Examples include `int32` to `string`, `utcDateTime` to `plainDate`, or any `@encode` change that alters the effective wire format.

```typespec
// Before
model CreateWidgetRequest {
  count: int32;
}

// After
model CreateWidgetRequest {
  count: string;
}
```

#### Type narrowing — accepting fewer values

**Rule:** `RequestTypeNarrowed`

Severity: Error.

DiffKind: `RequestTypeNarrowed`

❌ A narrowing change is breaking for requests because clients may send values that used to be accepted but are now rejected.
Typical examples include shrinking a numeric range, converting an open type to a closed set, or removing union variants.

```typespec
// Before
model CreateWidgetRequest {
  state: string;
}

// After
model CreateWidgetRequest {
  state: "active" | "inactive";
}
```

#### Request property type narrowing

**Rule:** `RequestPropertyTypeNarrowed`

Severity: Error.

DiffKind: `RequestPropertyTypeNarrowed`

❌ A request property accepting fewer values is breaking because existing payloads may be rejected.

#### Making an optional parameter required

**Rule:** `ParameterMadeRequired`

Severity: Error.

DiffKind: `RequestParameterMadeRequired`, `RequestPropertyMadeRequired`

❌ Changing an optional request parameter or property to required is breaking.
Clients that omitted the field before will now fail unless they are updated to always provide it.

#### Strengthening a constraint

**Rule:** `ConstraintStrengthened`

Severity: Error.

DiffKind: `RequestConstraintStrengthened`

❌ Tightening a validation constraint is breaking because it narrows the set of accepted values without changing the declared TypeSpec type.
This includes stronger `@minLength`, `@maxValue`, `@pattern`, `@minItems`, and similar validation rules.

```typespec
// Before
model CreateWidgetRequest {
  @minLength(1)
  name: string;
}

// After
model CreateWidgetRequest {
  @minLength(3)
  name: string;
}
```

#### Relaxing a response constraint

**Rule:** `ConstraintRelaxed`

Severity: Error.

DiffKind: `ResponseConstraintRelaxed`

❌ Relaxing a response constraint is breaking because clients may not handle the broader range of values the service can now return.
This includes weaker `@minLength`, `@maxValue`, `@pattern`, `@minItems`, and similar validation rules on response types.

#### Moving a parameter location

**Rule:** `ParameterLocationChanged`

Severity: Error.

DiffKind: `RequestParameterLocationChanged`

❌ Moving a parameter between locations such as query, header, path, or body is breaking.
The logical meaning may be similar, but the HTTP request shape changes and existing clients send the value in the wrong place.

#### Removing a request content type

**Rule:** `RemovedRequestContentType`

Severity: Error.

DiffKind: `RequestContentTypeRemoved`

❌ Removing a supported request content type is breaking because clients may still send payloads using that media type.
If an operation used to accept both JSON and XML and now only accepts JSON, XML callers break even though the operation still exists.

### 5.4 Response Rules

#### Removing a response property

**Rule:** `RemovedResponseProperty`

Severity: Error.

DiffKind: `ResponsePropertyRemoved`

❌ Removing a response property is breaking because clients may rely on it being present.
Even if some clients ignore the field, the contract no longer guarantees data that existing callers may read or persist.

#### Renaming a response property

**Rule:** `RenamedResponseProperty`

Severity: Error.

DiffKind: `ResponsePropertyRenamed`

❌ Renaming a response property is breaking because clients reading the old name get nothing.

#### Incompatible type change — format change

**Rule:** `ResponseTypeChanged`

Severity: Error.

DiffKind: `ResponseTypeChanged`

❌ A response format change is always breaking because the client receives a different wire representation than before.
Changing a field from a number to a string, or from one temporal wire format to another, can break parsing and downstream logic immediately.

#### Type widening — returning more possible values

**Rule:** `ResponseTypeWidened`

Severity: Error.

DiffKind: `ResponseTypeWidened`

❌ A widening change is breaking for responses because the service can now return values the client may not know how to parse, store, or branch on.
This is the mirror image of request widening, which is why direction matters.

```typespec
// Before
model Widget {
  count: int32;
}

// After
model Widget {
  count: int64;
}
```

#### Response property type widening

**Rule:** `ResponsePropertyTypeWidened`

Severity: Error.

DiffKind: `ResponsePropertyTypeWidened`

❌ A response property returning more possible values is breaking because clients with exhaustive handling may not handle the new values.

#### Making a required property optional

**Rule:** `ResponsePropertyMadeOptional`

Severity: Error.

DiffKind: `ResponsePropertyMadeOptional`

❌ Changing a required response property to optional is breaking because clients may assume the field is always present.
Once the property can disappear, generated SDKs and handwritten consumers may encounter nullability or missing-field failures.

#### Removing a success status code

**Rule:** `RemovedResponseStatusCode`

Severity: Error.

DiffKind: `ResponseStatusCodeRemoved`

❌ Removing a success status code is breaking because clients may depend on that status code being part of the successful contract.
A caller that treats `200` and `204` differently can break if one of those successful outcomes disappears.

#### Adding a response status code

**Rule:** `AddedResponseStatusCode`

Severity: Error.

DiffKind: `ResponseStatusCodeAdded`

❌ Adding a new response status code is breaking because clients must handle a status code they were not expecting.
A new status code represents a new response variant that existing client code has no handling logic for.

#### Removing a response content type

**Rule:** `RemovedResponseContentType`

Severity: Error.

DiffKind: `ResponseContentTypeRemoved`

❌ Removing a response content type is breaking because clients may negotiate or parse that media type specifically.
The service is no longer honoring an output format that was previously part of the contract.

#### Adding a response content type

**Rule:** `AddedResponseContentType`

Severity: Error.

DiffKind: `ResponseContentTypeAdded`

❌ Adding a new response content type is breaking because it widens the scope of what a client must be prepared to parse.
Clients negotiating or assuming a specific format may receive an unexpected media type.

#### Removing a response header

**Rule:** `RemovedResponseHeader`

Severity: Error.

DiffKind: `ResponseHeaderRemoved`

❌ Removing a response header is breaking when clients depend on that header for concurrency, paging, tracing, or cache behavior.
Headers are part of the HTTP contract just like body fields and status codes.

#### Adding an error response

**Rule:** `AddedErrorResponse`

Severity: Error.

DiffKind: `ErrorResponseAdded`

❌ Adding a new error response status code is breaking because clients must handle an error they were not expecting.

#### Removing an error response

**Rule:** `RemovedErrorResponse`

Severity: Error.

DiffKind: `ErrorResponseRemoved`

❌ Removing an error response status code is breaking because clients handling that error will never see it.

#### Removing a value from a closed enum or union

**Rule:** `RemovedEnumValue`

Severity: Error in requests, Ignore in responses.

DiffKind: `EnumValueRemoved`, `UnionVariantRemoved`

❌ Removing a member from a closed enum or a variant from a closed union is a narrowing change. That is breaking in requests because callers may still send that value, but it is ignored in responses because clients continue to work when the service returns fewer values.
All enums are closed in TypeSpec, so this rule applies to every enum automatically.

#### Adding a value to a closed enum or union

**Rule:** `AddedEnumValue`

Severity: Error.

DiffKind: `EnumValueAdded`, `UnionVariantAdded`

❌ Adding a member to a closed enum or adding a variant to a closed union is breaking in response context because clients with exhaustive handling can break.
Adding an enum value in request context is not breaking. Adding a variant to an open union is not breaking.

#### Adding or removing a variant in an open union

**Rule:** Not breaking.

Adding or removing a named variant in an open union is expressly NOT a breaking change. Clients of open unions must already handle unknown variants by design because the base scalar remains accepted. Only closed unions and enums trigger directional add/remove rules.

### 5.5 Model and Type Rules

#### Type kind changes

**Rule:** `TypeKindChanged`

Severity: Error.

DiffKind: `TypeKindChanged`, `RequestTypeKindChanged`, `ResponseTypeKindChanged`

❌ Changing the structural kind of a type is always breaking.

TypeSpec models represent three distinct wire shapes:

- **Models with properties** — JSON objects with named fields
- **Arrays** — JSON arrays with an item type
- **Records** — JSON objects with arbitrary keys and a value type

Changing between any of these is an incompatible wire change. For Arrays, changes to the item type are recursively processed. For Records, changes to the value type are recursively processed.

#### Type transition classification

Every type transition is classified into one of three categories before request/response severity is applied.
The category describes the shape of the value-set change; the request/response direction determines whether that change is breaking or allowed.

| Category      | Meaning                                             | Request    | Response   |
| ------------- | --------------------------------------------------- | ---------- | ---------- |
| Format change | Incompatible wire representation or encoding change | ❌ Error   | ❌ Error   |
| Narrowing     | Fewer possible values                               | ❌ Error   | ✅ Allowed |
| Widening      | More possible values                                | ✅ Allowed | ❌ Error   |

A format change is always breaking.
A narrowing change is breaking in requests and allowed in responses.
A widening change is allowed in requests and breaking in responses.

#### Numeric transitions

Numeric transitions are evaluated by wire-family and range.
Changes within the same family are usually widening or narrowing; changes across incompatible families are format changes.
See the tables below for the complete transition matrix.

##### Widening (larger representable domain)

| Source Type | Wider Compatible Types               |
| ----------- | ------------------------------------ |
| `int8`      | `int16`, `int32`, `int64`, `numeric` |
| `int16`     | `int32`, `int64`, `numeric`          |
| `int32`     | `int64`, `numeric`                   |
| `int64`     | `numeric`                            |
| `float32`   | `float64`, `numeric`                 |
| `float64`   | `numeric`                            |

##### Narrowing (smaller representable domain)

| Source Type | Narrower Compatible Types              |
| ----------- | -------------------------------------- |
| `numeric`   | `int64`, `int32`, `float64`, `float32` |
| `int64`     | `int32`, `int16`, `int8`               |
| `int32`     | `int16`, `int8`                        |
| `int16`     | `int8`                                 |
| `float64`   | `float32`                              |

##### Numeric Format Changes (always Error)

| From                      | To                        | Why                                          |
| ------------------------- | ------------------------- | -------------------------------------------- |
| Any integer               | Any float                 | Integer and floating-point wire forms differ |
| Any float                 | Any integer               | Integer and floating-point wire forms differ |
| Any integer               | `decimal` or `decimal128` | Decimal serialization semantics differ       |
| `decimal` or `decimal128` | Any integer or float      | Decimal serialization semantics differ       |
| Any numeric               | `string`                  | Wire type changes                            |
| `string`                  | Any numeric               | Wire type changes                            |

#### Temporal transitions

All temporal transitions are treated as format changes.
Even when two types are both time-like, they encode different wire semantics or representations.
These transitions are always errors.
See the tables below for the complete transition matrix.

##### Temporal Format Changes (always Error)

| From             | To               | Why                                            |
| ---------------- | ---------------- | ---------------------------------------------- |
| `utcDateTime`    | `offsetDateTime` | Wire format changes (offset component added)   |
| `offsetDateTime` | `utcDateTime`    | Wire format changes (offset component removed) |
| `utcDateTime`    | `plainDate`      | Time component removed                         |
| `utcDateTime`    | `plainTime`      | Date component removed                         |
| `plainDate`      | `utcDateTime`    | Different wire format                          |
| `plainTime`      | `utcDateTime`    | Different wire format                          |
| `plainDate`      | `plainTime`      | Different wire meaning and format              |
| `duration`       | `string`         | Loses temporal semantics                       |
| `string`         | `duration`       | Gains temporal constraints                     |
| Any temporal     | Any numeric      | Wire type changes                              |

#### String and string-like transitions

String-like transitions distinguish between constrained strings and completely different wire kinds.
A stronger string constraint is usually a narrowing; switching away from string semantics is a format change.
See the tables below for the complete transition matrix.

##### String-like Widening

| From  | To       | Classification |
| ----- | -------- | -------------- |
| `url` | `string` | Widening       |

##### String-like Narrowing

| From     | To    | Classification |
| -------- | ----- | -------------- |
| `string` | `url` | Narrowing      |

##### String-like Format Changes

| From        | To          | Why it is a format change       |
| ----------- | ----------- | ------------------------------- |
| `string`    | `bytes`     | Plain text versus encoded bytes |
| `bytes`     | `string`    | Encoded bytes versus plain text |
| `string`    | Any numeric | Wire type changes               |
| Any numeric | `string`    | Wire type changes               |
| `string`    | `boolean`   | Wire type changes               |
| `boolean`   | `string`    | Wire type changes               |

#### Union and enum transitions

All `enum` types are closed.
The open/closed distinction only applies to string unions and numeric unions, where an open union includes the base scalar such as `string` or `int32`.

A closed union represents a finite value set.
An open union represents known values plus any value from the base scalar type.
The same distinction applies to numeric unions such as `1 | 2 | 3` versus `1 | 2 | 3 | int32`.

| Transition                                    | Classification | Request    | Response                            |
| --------------------------------------------- | -------------- | ---------- | ----------------------------------- | ---------- |
| Enum add member                               | Widening       | ✅ Allowed | ❌ Error for closed response values |
| Enum remove member                            | Narrowing      | ❌ Error   | ✅ Allowed                          |
| Closed string or numeric union add variant    | Widening       | ✅ Allowed | ❌ Error for closed response values |
| Closed string or numeric union remove variant | Narrowing      | ❌ Error   | ✅ Allowed                          |
| Closed string union → open string union       | Widening       | ✅ Allowed | ❌ Error                            |
| Open string union → closed string union       | Narrowing      | ❌ Error   | ✅ Allowed                          |
| Open string union add named variant           | Ignore         | ✅ Allowed | ✅ Allowed                          |
| Open string union remove named variant        | Ignore         | ✅ Allowed | ✅ Allowed                          |
| `string` → closed string union                | Narrowing      | ❌ Error   | ✅ Allowed                          |
| Closed string union → `string`                | Widening       | ✅ Allowed | ❌ Error                            |
| `string` → open string union                  | Ignore         | ✅ Allowed | ✅ Allowed                          |
| Discriminated union add variant               | Widening       | ✅ Allowed | ❌ Error                            |
| Discriminated union remove variant            | Narrowing      | ❌ Error   | ✅ Allowed                          |
| `T` → `T                                      | null`          | Widening   | ✅ Allowed                          | ❌ Error   |
| `T                                            | null`→`T`      | Narrowing  | ❌ Error                            | ✅ Allowed |

```typespec
// Closed union: fixed set of values
alias Status = "active" | "inactive";

// Open union: known values plus any string
alias Status = "active" | "inactive" | string;
```

```typespec
// Enum values are always closed
// Adding Updating widens the set of possible values.
enum ProvisioningState {
  Succeeded,
  Failed,
  Updating,
}
```

For open unions, adding or removing a named literal is not breaking by itself because the base scalar already admits unknown values.
For closed unions and enums, adding or removing members changes the actual contract surface and must be evaluated directionally.

#### Encoding changes (`@encode`)

`@encode` participates in breaking-change analysis because it changes the effective wire format, not just the logical TypeSpec type.
A change is breaking unless the new encoding exactly matches the default encoding that would have applied without the decorator.

##### Default effective encodings

These defaults matter because adding a decorator that restates the default is a no-op.
Only a change to a different effective encoding is breaking.

| Type             | Default effective encoding | Default wire type |
| ---------------- | -------------------------- | ----------------- |
| `bytes`          | `base64`                   | `string`          |
| `utcDateTime`    | `rfc3339`                  | `string`          |
| `offsetDateTime` | `rfc3339`                  | `string`          |
| `duration`       | `ISO8601`                  | `string`          |

##### Common encoding outcomes

| Change                                                                     | Classification  | Result     |
| -------------------------------------------------------------------------- | --------------- | ---------- |
| No `@encode` → `@encode("base64")` on `bytes`                              | Matches default | ✅ Allowed |
| No `@encode` → `@encode("base64url")` on `bytes`                           | Format change   | ❌ Error   |
| No `@encode` → `@encode("rfc3339")` on `utcDateTime` (non-header contexts) | Matches default | ✅ Allowed |
| No `@encode` → `@encode("rfc7231")` on `utcDateTime` (non-header contexts) | Format change   | ❌ Error   |
| No `@encode` → `@encode("rfc7231")` on `utcDateTime` in HTTP headers       | Matches default | ✅ Allowed |
| No `@encode` → `@encode("unixTimestamp", int32)` on `utcDateTime`          | Format change   | ❌ Error   |
| `@encode("rfc3339")` → `@encode("rfc7231")`                                | Format change   | ❌ Error   |
| `@encode("rfc3339")` → `@encode("unixTimestamp", int32)`                   | Format change   | ❌ Error   |
| `@encode("base64")` → `@encode("base64url")`                               | Format change   | ❌ Error   |
| `@encode("unixTimestamp", int32)` → no `@encode` on `utcDateTime`          | Format change   | ❌ Error   |

```typespec
// Allowed: explicit encoding matches the default
model BlobRef {
  @encode("base64")
  data: bytes;
}
```

```typespec
// Breaking: the wire format changes from RFC 3339 string to Unix timestamp integer
model Widget {
  @encode("unixTimestamp", int32)
  createdAt: utcDateTime;
}
```

`unixTimestamp` is only valid with a numeric wire type.
Any transition between `unixTimestamp` and a string-based datetime encoding is therefore a format change even when the logical value is still “a datetime”.

#### Optionality and requiredness transitions

Optionality changes are directional.
Making a value mandatory narrows the contract; making it optional widens the contract.

| Change                | Classification   | Request    | Response   |
| --------------------- | ---------------- | ---------- | ---------- |
| Optional → required   | Narrowing        | ❌ Error   | ✅ Allowed |
| Required → optional   | Widening         | ✅ Allowed | ❌ Error   |
| Add optional property | Widening         | ✅ Allowed | ✅ Allowed |
| Add required property | Narrowing        | ❌ Error   | ✅ Allowed |
| Remove property       | Contract removal | ❌ Error   | ❌ Error   |

For concrete response rules, a required property becoming optional is still treated as an error because clients may depend on the field always being present.
For concrete request rules, an optional property becoming required is an error because callers that omitted it no longer satisfy the contract.

#### Resource types (bidirectional models)

A model used in both requests and responses is evaluated once per direction.
If a change is breaking in either direction, the model change is treated as breaking overall.

```typespec
// BarProperties appears in both PUT requests and GET responses.
model BarProperties {
  count: int64; // was int32
}
```

In this example, `int32` to `int64` is a widening change.
✅ In requests, widening is acceptable because the service accepts more values.
❌ In responses, widening is breaking because clients may not handle the larger range.
Because the model is bidirectional, the overall result is breaking.
