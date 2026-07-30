# Breaking Change Violations Reference

This document describes all violation types detected by `@azure-tools/typespec-breaking-change`,
organized by category. Each entry explains what the violation means, when it's triggered, its
default severity, and how to suppress it if the change is intentional.

---

## Suppression Overview

When a breaking change is **intentional and approved**, you can suppress the violation by adding
a decorator to the affected type or property in your TypeSpec source:

### Phase B (cross-version) suppression

```typespec
@approvedBreakingChange("Reason for this change", "ViolationKind")
model MyModel {
  // ... the affected property
}
```

### Phase A (same-version) suppression

```typespec
@approvedUnversionedChange("Reason for this change", "ViolationKind")
model MyModel {
  // ...
}
```

### Decorator parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `reason` | Yes | Human-readable explanation of why this breaking change is approved |
| `kind` | No | Specific `DiffKind` to suppress (e.g., `"ResponsePropertyRemoved"`). If omitted, suppresses ALL violation kinds on this type. |
| `version` | No | Only suppress for versions >= this value (e.g., `"2025-01-01"`) |
| `path` | No | Only suppress for elements matching this path suffix (e.g., `"properties.legacyField"`) |

### Placement rules

1. **On the affected property** — most precise, suppresses only that property's violations
2. **On the parent model** — suppresses all violations within that model
3. **On the origin declaration** — when a model is shared across operations, suppressing on the declaration suppresses all occurrences

---

## Phase A: Same-Version Violations

Phase A compares the **same api-version** between base (main branch) and head (PR branch).
Any detected change in a released version is a violation — the api-version contract must not change.

**Default severity**: All Phase A violations are `error` (rule: `phase-a-any-change`).

Any `DiffKind` listed below can appear in Phase A. The key difference from Phase B is that
**ALL changes are errors** in Phase A, because a released version's contract is frozen.

**Example**: You have `2024-01-01` in both main and your PR, but you changed a property name
in the PR's version of `2024-01-01`. This is a Phase A violation.

```typespec
// To suppress:
@approvedUnversionedChange("Fix typo in property name, backward compatible via alias", "RequestPropertyRenamed")
model Widget {
  newName: string;
}
```

---

## Phase B: Cross-Version Violations

Phase B compares consecutive versions (each new/changed version vs. the previous **stable** version).
Severity depends on the direction and nature of the change.

---

### Service-Level Violations

#### `ApiVersionRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | service-level |
| **Triggered when** | An api-version that existed in the previous stable version is no longer present |
| **Why it's breaking** | Clients targeting that version will receive errors |

```typespec
@approvedBreakingChange("Retiring deprecated version per lifecycle policy", "ApiVersionRemoved")
@versioned(Versions)
namespace Microsoft.Widget;
```

#### `ApiVersionAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | service-level |
| **Triggered when** | A new api-version is added |
| **Why it's safe** | Adding versions is always backward-compatible |

#### `AuthSchemeRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | service-level |
| **Triggered when** | An authentication scheme (e.g., Bearer, ApiKey) is removed |
| **Why it's breaking** | Clients using that auth scheme will fail |

```typespec
@approvedBreakingChange("Migrating from API key to OAuth only", "AuthSchemeRemoved")
@service(#{ title: "Widget Service" })
namespace Microsoft.Widget;
```

#### `AuthSchemeAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | service-level |
| **Triggered when** | A new authentication scheme is added |
| **Why it's safe** | Existing clients continue to use their current scheme |

#### `OAuthScopeRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | service-level |
| **Triggered when** | An OAuth scope is removed from the required scopes |
| **Why it's breaking** | Clients with tokens scoped to that value may lose access |

#### `OAuthScopeAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | service-level |
| **Triggered when** | A new OAuth scope is added |
| **Why it's safe** | Adding scopes doesn't affect existing tokens |

---

### Operation-Level Violations

#### `OperationRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | operation-lifecycle |
| **Triggered when** | An HTTP operation (method + path) no longer exists |
| **Why it's breaking** | Clients calling this endpoint will receive 404 |

```typespec
@approvedBreakingChange("Operation deprecated in 2024-01, removed per policy", "OperationRemoved")
namespace Microsoft.Widget;
```

#### `OperationAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | operation-lifecycle |
| **Triggered when** | A new HTTP operation is introduced |
| **Why it's safe** | Existing clients don't call endpoints they don't know about |

#### `OperationRouteChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | operation-lifecycle |
| **Triggered when** | An operation's HTTP method or path structure changes |
| **Why it's breaking** | Clients targeting the old route will get 404 or method-not-allowed |

---

### Request Parameter Violations

#### `RequestPathParameterAdded`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A new path parameter is added to the URL template |
| **Why it's breaking** | Changes the URL structure; existing client code won't include the new segment |

#### `RequestPathParameterRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A path parameter is removed from the URL template |
| **Why it's breaking** | Clients still sending the parameter will hit a different route |

#### `RequestQueryParameterAdded`

| | |
|-|-|
| **Severity** | ignore (if optional) / error (if required) |
| **Rule** | request-narrowing or request-widening |
| **Triggered when** | A new query parameter is added |
| **Why** | Optional query params are backward-compatible. Required ones break clients that don't send them. |

```typespec
// Only needed if the parameter is required:
@approvedBreakingChange("Required filter param for performance", "RequestQueryParameterAdded")
op listWidgets(@query filter: string): Widget[];
```

#### `RequestQueryParameterRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A query parameter no longer exists |
| **Why it's breaking** | Clients sending this parameter may get validation errors |

#### `RequestHeaderAdded`

| | |
|-|-|
| **Severity** | ignore (if optional) / error (if required) |
| **Rule** | request-narrowing or request-widening |
| **Triggered when** | A new request header is added |
| **Why** | Same as query parameters — optional is safe, required breaks clients |

#### `RequestHeaderRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A request header no longer exists |
| **Why it's breaking** | Clients sending this header may get unexpected behavior |

#### `RequestParameterRenamed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A parameter's wire name changes |
| **Why it's breaking** | Clients using the old name will not match the new name |

#### `RequestParameterMadeRequired`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A previously optional parameter is now required |
| **Why it's breaking** | Existing clients that didn't send this parameter will now fail validation |

```typespec
@approvedBreakingChange("Making region required for routing", "RequestParameterMadeRequired")
op createWidget(@query region: string): Widget;
```

#### `RequestParameterMadeOptional`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | request-widening |
| **Triggered when** | A required parameter becomes optional |
| **Why it's safe** | Clients already sending it continue to work |

#### `RequestParameterDefaultChanged`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | default-value-change |
| **Triggered when** | The default value of a parameter changes |
| **Why it's typically safe** | Clients that explicitly set the value are unaffected; only implicit behavior changes |

#### `RequestParameterLocationChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A parameter moves from one location to another (e.g., query → header) |
| **Why it's breaking** | Clients send the parameter in the wrong location |

---

### Request Body Property Violations

#### `RequestPropertyAdded`

| | |
|-|-|
| **Severity** | error (if required) / ignore (if optional) |
| **Rule** | request-narrowing or request-widening |
| **Triggered when** | A new property is added to the request body |
| **Why** | Required properties break clients that don't include them. Optional properties are safe. |

```typespec
model CreateWidgetRequest {
  @approvedBreakingChange("Tags now required for resource governance", "RequestPropertyAdded")
  tags: Record<string>;
}
```

#### `RequestPropertyRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A property is removed from the request body schema |
| **Why it's breaking** | Clients sending this property may get validation errors or silent data loss |

#### `RequestPropertyRenamed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A request property's wire name changes |
| **Why it's breaking** | Clients using the old name will not populate the renamed field |

#### `RequestPropertyTypeChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | The type of a request property changes (e.g., string → integer) |
| **Why it's breaking** | Clients sending the old type will fail validation |

#### `RequestPropertyTypeNarrowed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A request property's type becomes more restrictive (e.g., `string` → `"foo" | "bar"`) |
| **Why it's breaking** | Clients sending values outside the new range will be rejected |

#### `RequestPropertyTypeWidened`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | request-widening |
| **Triggered when** | A request property's type becomes less restrictive |
| **Why it's safe** | All previously-valid values remain valid |

#### `RequestPropertyMadeRequired`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A previously optional request property becomes required |
| **Why it's breaking** | Existing requests without this property will fail |

```typespec
model WidgetProperties {
  @approvedBreakingChange("SKU is now mandatory for billing", "RequestPropertyMadeRequired")
  sku: WidgetSku;
}
```

#### `RequestPropertyMadeOptional`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | request-widening |
| **Triggered when** | A required request property becomes optional |
| **Why it's safe** | Clients already sending it continue to work |

#### `RequestPropertyDefaultChanged`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | default-value-change |
| **Triggered when** | The default value of a request property changes |
| **Why it's typically safe** | Clients that explicitly set values are unaffected |

---

### Request Type & Encoding Violations

#### `RequestTypeChanged` / `RequestTypeNarrowed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | The overall request body type changes or becomes more restrictive |
| **Why it's breaking** | Clients sending the old shape/range will be rejected |

#### `RequestTypeWidened`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | request-widening |
| **Triggered when** | The request body type accepts more values |
| **Why it's safe** | All previously-valid payloads remain valid |

#### `RequestTypeKindChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | type-kind-change |
| **Triggered when** | The fundamental type kind changes (e.g., model → scalar, enum → union) |
| **Why it's breaking** | Complete incompatibility between old and new wire format |

#### `RequestEncodingChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | encoding-change |
| **Triggered when** | The encoding of a value changes (e.g., `rfc3339` → `unixTimestamp`) |
| **Why it's breaking** | Clients encoding values in the old format will produce invalid data |

#### `RequestConstraintStrengthened`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A constraint becomes more restrictive (e.g., `@maxLength(100)` → `@maxLength(50)`) |
| **Why it's breaking** | Values that were previously valid may now be rejected |

#### `RequestConstraintRelaxed`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | request-widening |
| **Triggered when** | A constraint becomes less restrictive |
| **Why it's safe** | All previously-valid values remain valid |

#### `RequestContentTypeAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | request-widening |
| **Triggered when** | A new content type is accepted for requests |
| **Why it's safe** | Existing content types remain valid |

#### `RequestContentTypeRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | A content type is no longer accepted for requests |
| **Why it's breaking** | Clients using that content type will get 415 Unsupported Media Type |

---

### Response Property Violations

#### `ResponsePropertyAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A new property appears in the response body |
| **Why it's safe** | Well-behaved clients ignore unknown properties |

#### `ResponsePropertyRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | A property is removed from the response body |
| **Why it's breaking** | Clients that read this property will get null/missing data |

```typespec
model WidgetProperties {
  @approvedBreakingChange("Legacy status moved to provisioningState", "ResponsePropertyRemoved")
  legacyStatus?: string;
}
```

#### `ResponsePropertyRenamed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | A response property's wire name changes |
| **Why it's breaking** | Clients deserializing by name will miss the value |

#### `ResponsePropertyTypeChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | The type of a response property changes |
| **Why it's breaking** | Clients expecting the old type will fail to deserialize |

#### `ResponsePropertyTypeNarrowed`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A response property's type becomes more restrictive |
| **Why it's safe** | Clients handle a subset of previous values |

#### `ResponsePropertyTypeWidened`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-widening |
| **Triggered when** | A response property's type becomes less restrictive (e.g., enum gains a member) |
| **Why it's breaking** | Clients may receive values they don't handle (e.g., unknown enum member) |

```typespec
@approvedBreakingChange("Adding 'Suspended' status, SDKs handle unknown", "ResponsePropertyTypeWidened")
union ProvisioningState { "Succeeded", "Failed", "Suspended" }
```

#### `ResponsePropertyMadeRequired`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A response property becomes required (always present) |
| **Why it's safe** | Clients get more data than before, not less |

#### `ResponsePropertyMadeOptional`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | A previously required response property becomes optional |
| **Why it's breaking** | Clients expecting the property to always be present may null-deref |

---

### Response Type & Encoding Violations

#### `ResponseTypeChanged` / `ResponseTypeWidened`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-widening |
| **Triggered when** | The response body type changes or accepts a wider range |
| **Why it's breaking** | Clients may receive unexpected shapes |

#### `ResponseTypeNarrowed`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | The response body type is more constrained |
| **Why it's safe** | Clients handle a subset of previous values |

#### `ResponseTypeKindChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | type-kind-change |
| **Triggered when** | The fundamental response type kind changes |
| **Why it's breaking** | Complete wire format incompatibility |

#### `ResponseEncodingChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | encoding-change |
| **Triggered when** | The encoding of a response value changes |
| **Why it's breaking** | Clients decoding in the old format will produce incorrect values |

#### `ResponseConstraintStrengthened`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A response constraint becomes more restrictive |
| **Why it's safe** | Clients receive a tighter guarantee |

#### `ResponseConstraintRelaxed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | A response constraint becomes less restrictive |
| **Why it's breaking** | Clients relying on the constraint may encounter values outside the expected range |

---

### Response Structure Violations

#### `ResponseStatusCodeAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A new HTTP status code is returned |
| **Why it's safe** | Well-behaved clients handle unexpected status codes |

#### `ResponseStatusCodeRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | An HTTP status code is no longer returned |
| **Why it's breaking** | Clients with specific handlers for that status code lose functionality |

#### `ResponseContentTypeAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A new response content type is available |
| **Why it's safe** | Clients continue to receive their preferred content type |

#### `ResponseContentTypeRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | A response content type is no longer available |
| **Why it's breaking** | Clients requesting that content type will get a different format |

#### `ResponseHeaderAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | A new response header is included |
| **Why it's safe** | Clients ignore unknown headers |

#### `ResponseHeaderRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | response-contract-weakened |
| **Triggered when** | A response header is removed |
| **Why it's breaking** | Clients reading that header lose access to its data |

#### `ErrorResponseAdded` / `ErrorResponseRemoved`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | response-narrowing |
| **Triggered when** | An error response is added or removed |
| **Why it's safe** | Error response changes don't break successful-path clients |

---

### Enumeration & Discriminator Violations

#### `EnumerationMemberAdded`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | service-level |
| **Triggered when** | A new member is added to an enum/union |
| **Why it's typically safe** | Clients should handle unknown enum values gracefully |

> **Note**: If this enum is used in a **response**, adding members is actually a
> `ResponsePropertyTypeWidened` from the client's perspective. The tool may emit both.

#### `EnumerationMemberRemoved`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | An enum/union member is removed |
| **Why it's breaking** | Clients sending the removed value will get validation errors |

```typespec
@approvedBreakingChange("Removing deprecated 'Legacy' tier", "EnumerationMemberRemoved")
union WidgetTier { "Free", "Standard", "Premium" }
```

#### `EnumerationOpened`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | service-level |
| **Triggered when** | A fixed (closed) enum becomes an extensible (open) enum/union |
| **Why it's safe** | All existing values remain valid |

#### `EnumerationClosed`

| | |
|-|-|
| **Severity** | error |
| **Rule** | request-narrowing |
| **Triggered when** | An extensible enum becomes fixed |
| **Why it's breaking** | Clients sending custom/extended values will be rejected |

#### `DiscriminatorChanged`

| | |
|-|-|
| **Severity** | error |
| **Rule** | type-kind-change |
| **Triggered when** | The discriminator property of a polymorphic type changes |
| **Why it's breaking** | Clients using the old discriminator can't deserialize the new format |

---

### Default Value Violations

#### `DefaultValueAdded` / `DefaultValueRemoved` / `DefaultValueChanged`

| | |
|-|-|
| **Severity** | ignore |
| **Rule** | default-value-change |
| **Triggered when** | A default value is added, removed, or changed |
| **Why it's typically safe** | Clients that explicitly set values are unaffected. Only implicit behavior changes. |

> **Note**: While these are `ignore` by default, a default value change in a **response**
> could affect clients that rely on specific default behavior. Review on a case-by-case basis.

---

## Rule Categories

| Rule | Description | Direction |
|------|-------------|-----------|
| `phase-a-any-change` | Any modification to a released version | Both |
| `service-level` | Changes to service-wide concerns (versions, auth) | Both |
| `operation-lifecycle` | Operations added/removed/rerouted | Both |
| `request-narrowing` | Request contract becomes more restrictive | Request |
| `request-widening` | Request contract becomes less restrictive | Request |
| `response-contract-weakened` | Response provides less than before | Response |
| `response-narrowing` | Response provides more/tighter guarantees | Response |
| `response-widening` | Response type accepts wider range | Response |
| `type-kind-change` | Fundamental type structure change | Both |
| `encoding-change` | Wire encoding format change | Both |
| `default-value-change` | Default value modification | Both |

---

## Quick Reference: Breaking vs. Safe

| Change Direction | Request | Response |
|------------------|---------|----------|
| **Add required** | ❌ Breaking | ✅ Safe (stronger guarantee) |
| **Add optional** | ✅ Safe | ✅ Safe |
| **Remove** | ❌ Breaking | ❌ Breaking |
| **Narrow type** | ❌ Breaking (rejects values) | ✅ Safe (tighter guarantee) |
| **Widen type** | ✅ Safe (accepts more) | ❌ Breaking (unexpected values) |
| **Make required** | ❌ Breaking | ✅ Safe |
| **Make optional** | ✅ Safe | ❌ Breaking |
