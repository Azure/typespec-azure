# Violations Reference

This reference is organized around the tool's two comparison phases.

- **Phase A (`same-version`)** compares two separate compilations of the **same** api-version. Any diff here is a likely projection or modeling bug, not a "breaking vs. safe" change classification.
- **Phase B (`cross-version`)** compares a newer api-version to the previous stable api-version. **Only Phase B uses the breaking (`error`) vs. safe (`ignore`) classification from `src/policy.ts`.**

## Phase B summary table

The table below is **Phase B only**.

| Rule | DiffKind(s) | Phase B Severity | Category | Link |
|---|---|---|---|---|
| `service-level` | `ApiVersionRemoved`, `AuthSchemeRemoved`, `OAuthScopeRemoved` | `error` | Service surface | [Service-level violations](#service-level-violations) |
| `service-level` | `ApiVersionAdded`, `AuthSchemeAdded`, `OAuthScopeAdded` | `ignore` | Service surface | [Service-level violations](#service-level-violations) |
| `operation-lifecycle` | `OperationRemoved`, `OperationRouteChanged` | `error` | Operations | [Operation lifecycle violations](#operation-lifecycle-violations) |
| `operation-lifecycle` | `OperationAdded` | `ignore` | Operations | [Operation lifecycle violations](#operation-lifecycle-violations) |
| `request-narrowing` | `RequestPathParameterAdded`, `RequestPathParameterRemoved`, `RequestQueryParameterAdded` (required only), `RequestQueryParameterRemoved`, `RequestHeaderAdded` (required only), `RequestHeaderRemoved`, `RequestParameterRenamed`, `RequestParameterMadeRequired`, `RequestParameterLocationChanged`, `RequestPropertyAdded` (required only), `RequestPropertyRemoved`, `RequestPropertyRenamed`, `RequestPropertyTypeChanged`, `RequestPropertyTypeNarrowed`, `RequestPropertyMadeRequired`, `RequestTypeChanged`, `RequestTypeNarrowed`, `RequestConstraintStrengthened`, `RequestContentTypeRemoved`, `EnumerationMemberRemoved`, `EnumerationClosed` | `error` | Request contract | [Request contract violations](#request-contract-violations) |
| `request-widening` | `RequestQueryParameterAdded` (optional only), `RequestHeaderAdded` (optional only), `RequestParameterMadeOptional`, `RequestPropertyAdded` (optional only), `RequestPropertyTypeWidened`, `RequestPropertyMadeOptional`, `RequestTypeWidened`, `RequestConstraintRelaxed`, `RequestContentTypeAdded` | `ignore` | Request contract | [Request contract violations](#request-contract-violations) |
| `response-contract-weakened` | `ResponsePropertyRemoved`, `ResponsePropertyRenamed`, `ResponsePropertyTypeChanged`, `ResponsePropertyMadeOptional`, `ResponseConstraintRelaxed`, `ResponseStatusCodeRemoved`, `ResponseContentTypeRemoved`, `ResponseHeaderRemoved` | `error` | Response contract | [Response contract violations](#response-contract-violations) |
| `response-narrowing` | `ResponsePropertyAdded`, `ResponsePropertyTypeNarrowed`, `ResponsePropertyMadeRequired`, `ResponseTypeNarrowed`, `ResponseConstraintStrengthened`, `ResponseStatusCodeAdded`, `ResponseContentTypeAdded`, `ResponseHeaderAdded`, `ErrorResponseAdded`, `ErrorResponseRemoved` | `ignore` | Response contract | [Response contract violations](#response-contract-violations) |
| `response-widening` | `ResponsePropertyTypeWidened`, `ResponseTypeChanged`, `ResponseTypeWidened` | `error` | Response contract | [Response contract violations](#response-contract-violations) |
| `type-kind-change` | `TypeKindChanged`, `RequestTypeKindChanged`, `ResponseTypeKindChanged`, `DiscriminatorChanged` | `error` | Shared type system | [Shared type-system violations](#shared-type-system-violations) |
| `encoding-change` | `RequestEncodingChanged`, `ResponseEncodingChanged` | `error` | Serialization | [Shared type-system violations](#shared-type-system-violations) |
| `default-value-change` | `RequestParameterDefaultChanged`, `RequestPropertyDefaultChanged`, `DefaultValueAdded`, `DefaultValueRemoved`, `DefaultValueChanged` | `ignore` | Defaults | [Default-value violations](#default-value-violations) |
| `service-level` | `EnumerationMemberAdded`, `EnumerationOpened` | `ignore` | Enums | [Shared type-system violations](#shared-type-system-violations) |

## Suppressing Phase B findings with `@approvedBreakingChange`

Use `@approvedBreakingChange` only for **Phase B** findings that are intentionally approved.

### Setup

Add the library to your TypeSpec project and import it:

```typespec
import "@azure-tools/typespec-breaking-change";
using Azure.BreakingChange;
```

### Usage

```typespec
@approvedBreakingChange("reason")
@approvedBreakingChange("reason", "ResponsePropertyRemoved")
@approvedBreakingChange("reason", "ResponsePropertyRemoved", "2026-01-01")
```

### Parameters

| Parameter | Meaning |
|---|---|
| `reason` | Required explanation recorded on the suppression. |
| `kind` | Optional `DiffKind`. If omitted, the suppression matches every Phase B diff on that target. |
| `since` | Optional third positional string argument. It is a lower bound on the **head** api-version, so the suppression applies only when `headVersion >= since`. |

### `since` examples

Suppress every `ResponsePropertyRemoved` finding on and after `2026-01-01`:

```typespec
model Widget {
  @approvedBreakingChange(
    "Legacy field removed beginning with 2026-01-01",
    "ResponsePropertyRemoved",
    "2026-01-01"
  )
  legacyStatus?: string;
}
```

Without `since`, the same suppression matches every cross-version comparison that reaches this declaration:

```typespec
model Widget {
  @approvedBreakingChange("Legacy field removal is approved", "ResponsePropertyRemoved")
  legacyStatus?: string;
}
```

Place the decorator on the most specific declaration you can: property > model > operation > namespace.

### Suppression by operation identity

You can place `@approvedBreakingChange` on the **operation** instead of on the property or type.

This is useful when:

- the breaking change comes from a template-expanded type and you cannot decorate the property directly, or
- you want to suppress the finding only for one operation instead of everywhere that type is used.

Operation-level suppression:

```typespec
@approvedBreakingChange("Migrating getWidget response shape", "ResponsePropertyRemoved")
@route("/widgets/{id}")
@get
op getWidget(@path id: string): Widget;
```

Property-level suppression:

```typespec
model Widget {
  @approvedBreakingChange("Field removed per API review", "ResponsePropertyRemoved")
  @removed(Versions.v2)
  legacy?: string;
}
```

- **Property/type-level suppression is global**: it applies everywhere that declaration is used.
- **Operation-level suppression is scoped**: it suppresses findings only for that specific operation identity.
- Prefer **property/type-level** suppression for shared model changes, and **operation-level** suppression for operation-specific changes.

## Phase A: same-version findings are projection bugs, not breaking-change classifications

Phase A compares the **same api-version** produced by two separate compilations (for example, base branch vs. PR branch). If the same operation or model compiles to different wire shapes for the same version, that indicates a version projection inconsistency or modeling bug.

These findings:

- do **not** have a breaking vs. safe classification,
- always use rule `phase-a-any-change`, and
- are always reported as `error`.

Representative Phase A example:

```diff
 // base compilation of 2025-01-01
 op get(): Widget;
 model Widget {
-  etag?: string;
+  etag: string;
 }
```

That is not interpreted as "making `etag` required is a breaking change in Phase B". Instead, it means **the same released version produced two different wire contracts**, which is almost always a bug.

If you must suppress a known Phase A issue, use `@approvedUnversionedChange`, not `@approvedBreakingChange`:

```typespec
model Widget {
  @approvedUnversionedChange("Known projection bug while refactoring", "ResponsePropertyMadeRequired")
  etag: string;
}
```

## Phase B detailed reference

The sections below are organized by the exact `DiffKind` values from `src/diff-kind.ts`. Each section shows representative TypeSpec before/after diffs. Suppression examples use `@approvedBreakingChange` because Phase B is the only phase with breaking-change approvals. Ignore-only entries usually omit suppression snippets because there is no Phase B error to suppress.

## Service-level violations

### API version lifecycle (`ApiVersionRemoved`, `ApiVersionAdded`)

- `ApiVersionRemoved` → `error`, rule `service-level`
- `ApiVersionAdded` → `ignore`, rule `service-level`

```diff
 enum Versions {
   v2024_01_01: "2024-01-01",
-  v2025_01_01: "2025-01-01",
 }
```

```diff
 enum Versions {
   v2024_01_01: "2024-01-01",
+  v2025_01_01: "2025-01-01",
 }
```

```typespec
@approvedBreakingChange(
  "2024-01-01 is retired after the published support window",
  "ApiVersionRemoved",
  "2025-01-01"
)
@versioned(Versions)
namespace Demo;

enum Versions {
  v2024_01_01: "2024-01-01",
}
```

### Authentication scheme lifecycle (`AuthSchemeRemoved`, `AuthSchemeAdded`)

- `AuthSchemeRemoved` → `error`, rule `service-level`
- `AuthSchemeAdded` → `ignore`, rule `service-level`

```diff
 @useAuth(BearerAuth)
-@useAuth(ApiKeyAuth)
 namespace Demo;
```

```diff
 @useAuth(BearerAuth)
+@useAuth(ApiKeyAuth)
 namespace Demo;
```

```typespec
@approvedBreakingChange("API key auth is retired in favor of OAuth", "AuthSchemeRemoved")
@service(#{ title: "Demo" })
@useAuth(BearerAuth)
namespace Demo;
```

### OAuth scope lifecycle (`OAuthScopeRemoved`, `OAuthScopeAdded`)

- `OAuthScopeRemoved` → `error`, rule `service-level`
- `OAuthScopeAdded` → `ignore`, rule `service-level`

```diff
 @useAuth(OAuth2Auth<["demo.read", "demo.write"]>)
-@useAuth(OAuth2Auth<["demo.manage"]>)
 namespace Demo;
```

```diff
 @useAuth(OAuth2Auth<["demo.read", "demo.write"]>)
+@useAuth(OAuth2Auth<["demo.manage"]>)
 namespace Demo;
```

```typespec
@approvedBreakingChange("Legacy manage scope is retired", "OAuthScopeRemoved")
@useAuth(OAuth2Auth<["demo.read", "demo.write"]>)
namespace Demo;
```

## Operation lifecycle violations

### Operation lifecycle (`OperationRemoved`, `OperationAdded`)

- `OperationRemoved` → `error`, rule `operation-lifecycle`
- `OperationAdded` → `ignore`, rule `operation-lifecycle`

```diff
 interface Widgets {
-  @route("/widgets/{id}")
-  @delete
-  delete(@path id: string): void;
 }
```

```diff
 interface Widgets {
+  @route("/widgets/{id}:sync")
+  @post
+  sync(@path id: string): Widget;
 }
```

```typespec
interface Widgets {
  @approvedBreakingChange("Delete was deprecated in the previous stable API", "OperationRemoved")
  @removed(Versions.v2)
  @route("/widgets/{id}")
  @delete
  delete(@path id: string): void;
}
```

### Operation route changes (`OperationRouteChanged`)

- `OperationRouteChanged` → `error`, rule `operation-lifecycle`

```diff
 @route("/widgets/{id}")
+@route("/tenants/{tenantId}/widgets/{id}")
 @get
 op getWidget(@path id: string): Widget;
```

```typespec
@approvedBreakingChange("Tenant segment is required for global routing", "OperationRouteChanged")
@route("/tenants/{tenantId}/widgets/{id}")
@get
op getWidget(@path tenantId: string, @path id: string): Widget;
```

## Request contract violations

### Path parameters (`RequestPathParameterAdded`, `RequestPathParameterRemoved`)

- `RequestPathParameterAdded` → `error`, rule `request-narrowing`
- `RequestPathParameterRemoved` → `error`, rule `request-narrowing`

```diff
-@route("/widgets/{id}")
+@route("/subscriptions/{subscriptionId}/widgets/{id}")
 op getWidget(@path id: string): Widget;
```

```diff
-@route("/subscriptions/{subscriptionId}/widgets/{id}")
+@route("/widgets/{id}")
 op getWidget(@path id: string): Widget;
```

```typespec
@approvedBreakingChange("Subscription is now part of the resource identity", "RequestPathParameterAdded")
@route("/subscriptions/{subscriptionId}/widgets/{id}")
op getWidget(@path subscriptionId: string, @path id: string): Widget;
```

Approve removed path parameter:

```typespec
@approvedBreakingChange("Subscription segment is removed after resource flattening", "RequestPathParameterRemoved")
@route("/widgets/{id}")
op getWidget(@path id: string): Widget;
```

### Query parameters (`RequestQueryParameterAdded`, `RequestQueryParameterRemoved`)

- `RequestQueryParameterAdded` → `error` when the new query parameter is required; `ignore` when it is optional
- `RequestQueryParameterRemoved` → `error`, rule `request-narrowing`

Required addition:

```diff
-op listWidgets(): Widget[];
+op listWidgets(@query region: string): Widget[];
```

Optional addition:

```diff
-op listWidgets(): Widget[];
+op listWidgets(@query region?: string): Widget[];
```

Removal:

```diff
-op listWidgets(@query filter?: string): Widget[];
+op listWidgets(): Widget[];
```

```typespec
op listWidgets(
  @approvedBreakingChange("Region is required for sharded lookup", "RequestQueryParameterAdded")
  @query region: string,
): Widget[];
```

Approve removed query parameter:

```typespec
@approvedBreakingChange("Legacy filter parameter is removed", "RequestQueryParameterRemoved")
op listWidgets(): Widget[];
```

### Headers (`RequestHeaderAdded`, `RequestHeaderRemoved`)

- `RequestHeaderAdded` → `error` when the new header is required; `ignore` when it is optional
- `RequestHeaderRemoved` → `error`, rule `request-narrowing`

Required addition:

```diff
-op createWidget(@body body: CreateWidgetRequest): Widget;
+op createWidget(@header("x-region") region: string, @body body: CreateWidgetRequest): Widget;
```

Optional addition:

```diff
-op createWidget(@body body: CreateWidgetRequest): Widget;
+op createWidget(@header("x-region") region?: string, @body body: CreateWidgetRequest): Widget;
```

Removal:

```diff
-op createWidget(@header("x-ms-client-request-id") clientRequestId?: string, @body body: CreateWidgetRequest): Widget;
+op createWidget(@body body: CreateWidgetRequest): Widget;
```

```typespec
op createWidget(
  @approvedBreakingChange("Regional affinity header is mandatory", "RequestHeaderAdded")
  @header("x-region") region: string,
  @body body: CreateWidgetRequest,
): Widget;
```

Approve removed header:

```typespec
@approvedBreakingChange("x-ms-client-request-id is no longer accepted", "RequestHeaderRemoved")
op createWidget(@body body: CreateWidgetRequest): Widget;
```

### Parameter rename (`RequestParameterRenamed`)

- `RequestParameterRenamed` → `error`, rule `request-narrowing`

```diff
-op listWidgets(@query pageSize?: int32): Widget[];
+op listWidgets(@query maxPageSize?: int32): Widget[];
```

```typespec
op listWidgets(
  @approvedBreakingChange("Wire name aligned with REST guideline", "RequestParameterRenamed")
  @query maxPageSize?: int32,
): Widget[];
```

### Parameter requiredness (`RequestParameterMadeRequired`, `RequestParameterMadeOptional`)

- `RequestParameterMadeRequired` → `error`, rule `request-narrowing`
- `RequestParameterMadeOptional` → `ignore`, rule `request-widening`

```diff
-op listWidgets(@query region?: string): Widget[];
+op listWidgets(@query region: string): Widget[];
```

```diff
-op listWidgets(@query apiVersion: string): Widget[];
+op listWidgets(@query apiVersion?: string): Widget[];
```

```typespec
op listWidgets(
  @approvedBreakingChange("Region is now required for routing", "RequestParameterMadeRequired")
  @query region: string,
): Widget[];
```

### Parameter defaults (`RequestParameterDefaultChanged`)

- `RequestParameterDefaultChanged` → `ignore`, rule `default-value-change`

```diff
-op listWidgets(@query pageSize: int32 = 50): Widget[];
+op listWidgets(@query pageSize: int32 = 100): Widget[];
```

Because Phase B severity is `ignore`, no suppression is usually needed.

### Parameter location (`RequestParameterLocationChanged`)

- `RequestParameterLocationChanged` → `error`, rule `request-narrowing`

```diff
-op listWidgets(@query region?: string): Widget[];
+op listWidgets(@header("x-region") region?: string): Widget[];
```

```typespec
op listWidgets(
  @approvedBreakingChange("Region moved to header to match gateway policy", "RequestParameterLocationChanged")
  @header("x-region") region?: string,
): Widget[];
```

### Request body properties (`RequestPropertyAdded`, `RequestPropertyRemoved`)

- `RequestPropertyAdded` → `error` when the new property is required; `ignore` when it is optional
- `RequestPropertyRemoved` → `error`, rule `request-narrowing`

Required addition:

```diff
 model CreateWidgetRequest {
   name: string;
+  sku: string;
 }
```

Optional addition:

```diff
 model CreateWidgetRequest {
   name: string;
+  sku?: string;
 }
```

Removal:

```diff
 model CreateWidgetRequest {
   name: string;
-  tags?: Record<string>;
 }
```

```typespec
model CreateWidgetRequest {
  name: string;

  @approvedBreakingChange("SKU is now mandatory for billing", "RequestPropertyAdded")
  sku: string;
}
```

Approve removed request property:

```typespec
model CreateWidgetRequest {
  name: string;

  @approvedBreakingChange("tags is removed in v2", "RequestPropertyRemoved")
  @removed(Versions.v2)
  tags?: Record<string>;
}
```

### Request property rename (`RequestPropertyRenamed`)

- `RequestPropertyRenamed` → `error`, rule `request-narrowing`

```diff
 model CreateWidgetRequest {
-  displayName: string;
+  name: string;
 }
```

```typespec
model CreateWidgetRequest {
  @approvedBreakingChange("Wire name normalized to `name`", "RequestPropertyRenamed")
  name: string;
}
```

### Request property type evolution (`RequestPropertyTypeChanged`, `RequestPropertyTypeNarrowed`, `RequestPropertyTypeWidened`)

- `RequestPropertyTypeChanged` → `error`, rule `request-narrowing`
- `RequestPropertyTypeNarrowed` → `error`, rule `request-narrowing`
- `RequestPropertyTypeWidened` → `ignore`, rule `request-widening`

Changed kind:

```diff
 model CreateWidgetRequest {
-  size: string;
+  size: int32;
 }
```

Narrowed:

```diff
 model CreateWidgetRequest {
-  tier: string;
+  tier: "Free" | "Standard";
 }
```

Widened:

```diff
 model CreateWidgetRequest {
-  tier: "Free" | "Standard";
+  tier: string;
 }
```

```typespec
model CreateWidgetRequest {
  @approvedBreakingChange("size now uses int32 on the wire", "RequestPropertyTypeChanged")
  size: int32;
}
```

Approve narrowed request property type:

```typespec
model CreateWidgetRequest {
  @approvedBreakingChange("Only supported tiers remain allowed", "RequestPropertyTypeNarrowed")
  tier: "Free" | "Standard";
}
```

### Request property requiredness (`RequestPropertyMadeRequired`, `RequestPropertyMadeOptional`)

- `RequestPropertyMadeRequired` → `error`, rule `request-narrowing`
- `RequestPropertyMadeOptional` → `ignore`, rule `request-widening`

```diff
 model CreateWidgetRequest {
-  location?: string;
+  location: string;
 }
```

```diff
 model CreateWidgetRequest {
-  location: string;
+  location?: string;
 }
```

```typespec
model CreateWidgetRequest {
  @approvedBreakingChange("Location is required for placement", "RequestPropertyMadeRequired")
  location: string;
}
```

### Request property defaults (`RequestPropertyDefaultChanged`)

- `RequestPropertyDefaultChanged` → `ignore`, rule `default-value-change`

```diff
 model CreateWidgetRequest {
-  replicas?: int32 = 1;
+  replicas?: int32 = 3;
 }
```

Because Phase B severity is `ignore`, no suppression is usually needed.

### Request body type evolution (`RequestTypeChanged`, `RequestTypeNarrowed`, `RequestTypeWidened`)

- `RequestTypeChanged` → `error`, rule `request-narrowing`
- `RequestTypeNarrowed` → `error`, rule `request-narrowing`
- `RequestTypeWidened` → `ignore`, rule `request-widening`

Changed:

```diff
-op createWidget(@body body: string): Widget;
+op createWidget(@body body: CreateWidgetRequest): Widget;
```

Narrowed:

```diff
-op createWidget(@body body: string): Widget;
+op createWidget(@body body: "small" | "large"): Widget;
```

Widened:

```diff
-op createWidget(@body body: "small" | "large"): Widget;
+op createWidget(@body body: string): Widget;
```

```typespec
@approvedBreakingChange("Request body is now structured", "RequestTypeChanged")
op createWidget(@body body: CreateWidgetRequest): Widget;
```

Approve narrowed request body type:

```typespec
@approvedBreakingChange("Only named sizes are supported now", "RequestTypeNarrowed")
op createWidget(@body body: "small" | "large"): Widget;
```

### Request type kind (`RequestTypeKindChanged`)

- `RequestTypeKindChanged` → `error`, rule `type-kind-change`

```diff
-op createWidget(@body body: string): Widget;
+op createWidget(@body body: CreateWidgetRequest): Widget;
```

```typespec
@approvedBreakingChange("Request body moved from scalar to object payload", "RequestTypeKindChanged")
op createWidget(@body body: CreateWidgetRequest): Widget;
```

### Request encoding (`RequestEncodingChanged`)

- `RequestEncodingChanged` → `error`, rule `encoding-change`

```diff
-op search(@query createdAfter: utcDateTime): Widget[];
+op search(@query @encode("unixTimestamp") createdAfter: utcDateTime): Widget[];
```

```typespec
op search(
  @approvedBreakingChange("Gateway now requires unix timestamps", "RequestEncodingChanged")
  @query @encode("unixTimestamp") createdAfter: utcDateTime,
): Widget[];
```

### Request constraints (`RequestConstraintStrengthened`, `RequestConstraintRelaxed`)

- `RequestConstraintStrengthened` → `error`, rule `request-narrowing`
- `RequestConstraintRelaxed` → `ignore`, rule `request-widening`

```diff
 model CreateWidgetRequest {
-  @maxLength(100)
+  @maxLength(50)
   name: string;
 }
```

```diff
 model CreateWidgetRequest {
-  @maxLength(50)
+  @maxLength(100)
   name: string;
 }
```

```typespec
model CreateWidgetRequest {
  @approvedBreakingChange("Shorter names are required by the backing store", "RequestConstraintStrengthened")
  @maxLength(50)
  name: string;
}
```

### Request content types (`RequestContentTypeAdded`, `RequestContentTypeRemoved`)

- `RequestContentTypeAdded` → `ignore`, rule `request-widening`
- `RequestContentTypeRemoved` → `error`, rule `request-narrowing`

```diff
-@header contentType: "application/json"
+@header contentType: "application/json" | "application/merge-patch+json"
 op updateWidget(...): Widget;
```

```diff
-@header contentType: "application/json" | "application/xml"
+@header contentType: "application/json"
 op updateWidget(...): Widget;
```

```typespec
@approvedBreakingChange("XML payloads are no longer accepted", "RequestContentTypeRemoved")
@header contentType: "application/json"
op updateWidget(@body body: UpdateWidgetRequest): Widget;
```

## Response contract violations

### Response body properties (`ResponsePropertyAdded`, `ResponsePropertyRemoved`)

- `ResponsePropertyAdded` → `ignore`, rule `response-narrowing`
- `ResponsePropertyRemoved` → `error`, rule `response-contract-weakened`

```diff
 model Widget {
   id: string;
+  etag?: string;
 }
```

```diff
 model Widget {
   id: string;
-  etag?: string;
 }
```

```typespec
model Widget {
  id: string;

  @approvedBreakingChange("etag moved to a response header", "ResponsePropertyRemoved")
  @removed(Versions.v2)
  etag?: string;
}
```

### Response property rename (`ResponsePropertyRenamed`)

- `ResponsePropertyRenamed` → `error`, rule `response-contract-weakened`

```diff
 model Widget {
-  displayName?: string;
+  name?: string;
 }
```

```typespec
model Widget {
  @approvedBreakingChange("Wire name normalized to `name`", "ResponsePropertyRenamed")
  name?: string;
}
```

### Response property type evolution (`ResponsePropertyTypeChanged`, `ResponsePropertyTypeNarrowed`, `ResponsePropertyTypeWidened`)

- `ResponsePropertyTypeChanged` → `error`, rule `response-contract-weakened`
- `ResponsePropertyTypeNarrowed` → `ignore`, rule `response-narrowing`
- `ResponsePropertyTypeWidened` → `error`, rule `response-widening`

Changed:

```diff
 model Widget {
-  size?: string;
+  size?: int32;
 }
```

Narrowed:

```diff
 model Widget {
-  provisioningState?: string;
+  provisioningState?: "Succeeded" | "Failed";
 }
```

Widened:

```diff
 model Widget {
-  provisioningState?: "Succeeded" | "Failed";
+  provisioningState?: string;
 }
```

```typespec
model Widget {
  @approvedBreakingChange("size now returns int32 values", "ResponsePropertyTypeChanged")
  size?: int32;
}
```

Approve widened response property type:

```typespec
model Widget {
  @approvedBreakingChange("Clients are prepared for new provisioning states", "ResponsePropertyTypeWidened")
  provisioningState?: string;
}
```

### Response property requiredness (`ResponsePropertyMadeRequired`, `ResponsePropertyMadeOptional`)

- `ResponsePropertyMadeRequired` → `ignore`, rule `response-narrowing`
- `ResponsePropertyMadeOptional` → `error`, rule `response-contract-weakened`

```diff
 model Widget {
-  location?: string;
+  location: string;
 }
```

```diff
 model Widget {
-  location: string;
+  location?: string;
 }
```

```typespec
model Widget {
  @approvedBreakingChange("Location can be absent for legacy records", "ResponsePropertyMadeOptional")
  location?: string;
}
```

### Response body type evolution (`ResponseTypeChanged`, `ResponseTypeNarrowed`, `ResponseTypeWidened`)

- `ResponseTypeChanged` → `error`, rule `response-widening`
- `ResponseTypeNarrowed` → `ignore`, rule `response-narrowing`
- `ResponseTypeWidened` → `error`, rule `response-widening`

Changed:

```diff
-op getWidget(): Widget;
+op getWidget(): WidgetEnvelope;
```

Narrowed:

```diff
-op getState(): string;
+op getState(): "Succeeded" | "Failed";
```

Widened:

```diff
-op getState(): "Succeeded" | "Failed";
+op getState(): string;
```

```typespec
@approvedBreakingChange("Response now returns a new envelope shape", "ResponseTypeChanged")
op getWidget(): WidgetEnvelope;
```

Approve widened response type:

```typespec
@approvedBreakingChange("Clients can handle arbitrary state strings", "ResponseTypeWidened")
op getState(): string;
```

### Response type kind (`ResponseTypeKindChanged`)

- `ResponseTypeKindChanged` → `error`, rule `type-kind-change`

```diff
-op getWidget(): string;
+op getWidget(): Widget;
```

```typespec
@approvedBreakingChange("Response changed from scalar to structured payload", "ResponseTypeKindChanged")
op getWidget(): Widget;
```

### Response encoding (`ResponseEncodingChanged`)

- `ResponseEncodingChanged` → `error`, rule `encoding-change`

```diff
 model Widget {
-  updatedAt?: utcDateTime;
+  @encode("unixTimestamp")
+  updatedAt?: utcDateTime;
 }
```

```typespec
model Widget {
  @approvedBreakingChange("Timestamps are now emitted as unix seconds", "ResponseEncodingChanged")
  @encode("unixTimestamp")
  updatedAt?: utcDateTime;
}
```

### Response constraints (`ResponseConstraintStrengthened`, `ResponseConstraintRelaxed`)

- `ResponseConstraintStrengthened` → `ignore`, rule `response-narrowing`
- `ResponseConstraintRelaxed` → `error`, rule `response-contract-weakened`

```diff
 model Widget {
-  @maxLength(100)
+  @maxLength(50)
   name?: string;
 }
```

```diff
 model Widget {
-  @maxLength(50)
+  @maxLength(100)
   name?: string;
 }
```

```typespec
model Widget {
  @approvedBreakingChange("Legacy data can exceed the previous maximum", "ResponseConstraintRelaxed")
  @maxLength(100)
  name?: string;
}
```

### Response status codes (`ResponseStatusCodeAdded`, `ResponseStatusCodeRemoved`)

- `ResponseStatusCodeAdded` → `ignore`, rule `response-narrowing`
- `ResponseStatusCodeRemoved` → `error`, rule `response-contract-weakened`

```diff
 op createWidget(...):
   Widget | CreatedResponse;
+  @statusCode _: 202;
```

```diff
 op createWidget(...):
   Widget | CreatedResponse;
-  @statusCode _: 202;
```

```typespec
@approvedBreakingChange("202 Accepted is no longer returned after synchronous rollout", "ResponseStatusCodeRemoved")
op createWidget(...): Widget;
```

### Response content types (`ResponseContentTypeAdded`, `ResponseContentTypeRemoved`)

- `ResponseContentTypeAdded` → `ignore`, rule `response-narrowing`
- `ResponseContentTypeRemoved` → `error`, rule `response-contract-weakened`

```diff
-@produces("application/json")
+@produces("application/json", "application/problem+json")
 op getWidget(...): Widget;
```

```diff
-@produces("application/json", "application/xml")
+@produces("application/json")
 op getWidget(...): Widget;
```

```typespec
@produces("application/json")
@approvedBreakingChange("XML responses are removed", "ResponseContentTypeRemoved")
@get
op getWidget(...): Widget;
```

### Response headers (`ResponseHeaderAdded`, `ResponseHeaderRemoved`)

- `ResponseHeaderAdded` → `ignore`, rule `response-narrowing`
- `ResponseHeaderRemoved` → `error`, rule `response-contract-weakened`

```diff
 model GetWidgetResponseHeaders {
+  etag?: string;
 }
```

```diff
 model GetWidgetResponseHeaders {
-  etag?: string;
 }
```

```typespec
model GetWidgetResponseHeaders {
  @approvedBreakingChange("etag moved into the body payload", "ResponseHeaderRemoved")
  @removed(Versions.v2)
  etag?: string;
}
```

### Error responses (`ErrorResponseAdded`, `ErrorResponseRemoved`)

- `ErrorResponseAdded` → `ignore`, rule `response-narrowing`
- `ErrorResponseRemoved` → `ignore`, rule `response-narrowing`

```diff
 op getWidget(...): Widget |
+  NotFoundError;
```

```diff
 op getWidget(...): Widget |
-  NotFoundError;
```

Because Phase B severity is `ignore`, no suppression is usually needed.

## Shared type-system violations

### Shared kind changes (`TypeKindChanged`)

- `TypeKindChanged` → `error`, rule `type-kind-change`

```diff
-model WidgetStatus {
-  value: string;
-}
+enum WidgetStatus {
+  active,
+  disabled,
+}
```

```typespec
@approvedBreakingChange("Status moved from object to enum payload", "TypeKindChanged")
enum WidgetStatus {
  active,
  disabled,
}
```

### Enumeration member lifecycle (`EnumerationMemberAdded`, `EnumerationMemberRemoved`)

- `EnumerationMemberAdded` → `ignore`, rule `service-level`
- `EnumerationMemberRemoved` → `error`, rule `request-narrowing`

```diff
 union WidgetTier {
   "Free",
   "Standard",
+  "Premium",
 }
```

```diff
 union WidgetTier {
   "Free",
   "Standard",
-  "Legacy",
 }
```

```typespec
@approvedBreakingChange("Legacy tier is retired", "EnumerationMemberRemoved")
union WidgetTier {
  "Free",
  "Standard",
}
```

### Enumeration openness (`EnumerationOpened`, `EnumerationClosed`)

- `EnumerationOpened` → `ignore`, rule `service-level`
- `EnumerationClosed` → `error`, rule `request-narrowing`

```diff
-@closed
 union WidgetState {
   "Running",
   "Stopped",
 }
```

```diff
+@closed
 union WidgetState {
   "Running",
   "Stopped",
 }
```

```typespec
@approvedBreakingChange("Custom extension values are no longer accepted", "EnumerationClosed")
@closed
union WidgetState {
  "Running",
  "Stopped",
}
```

### Discriminator changes (`DiscriminatorChanged`)

- `DiscriminatorChanged` → `error`, rule `type-kind-change`

```diff
-@discriminator("kind")
+@discriminator("type")
 model WidgetBase {}
```

```typespec
@approvedBreakingChange("Polymorphic payloads now use `type`", "DiscriminatorChanged")
@discriminator("type")
model WidgetBase {}
```

## Default-value violations

### Default values (`DefaultValueAdded`, `DefaultValueRemoved`, `DefaultValueChanged`)

- `DefaultValueAdded` → `ignore`, rule `default-value-change`
- `DefaultValueRemoved` → `ignore`, rule `default-value-change`
- `DefaultValueChanged` → `ignore`, rule `default-value-change`

Added:

```diff
 model CreateWidgetRequest {
+  replicas?: int32 = 3;
 }
```

Removed:

```diff
 model CreateWidgetRequest {
-  replicas?: int32 = 3;
 }
```

Changed:

```diff
 model CreateWidgetRequest {
-  replicas?: int32 = 1;
+  replicas?: int32 = 3;
 }
```

Because Phase B severity is `ignore`, no suppression is usually needed.
