---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `optional` property to `SdkMethodResponse` to distinguish responses without body from nullable body types.

Previously, TCGC wrapped response types in `nullable` when operations had HTTP responses without bodies (e.g., `200 OK` with body + `204 No Content`). This made it impossible to distinguish from actual nullable body types (e.g., `{@body body: Type | null}`).

**Breaking Change**: Code generators must now check the new `optional` property when handling responses that may lack bodies.

**Migration Guide**:

Before:
```typescript
// Both cases returned nullable type
if (method.response.type?.kind === "nullable") {
  // Could be either:
  // 1. Actual nullable body: {@body body: Widget | null}
  // 2. Optional response: Widget | NoContentResponse
}
```

After:
```typescript
// Check optional property to distinguish the cases
if (method.response.optional === true) {
  // Response may not have a body (e.g., Widget | NoContentResponse)
  // type is the actual response type (not wrapped in nullable)
} else if (method.response.type?.kind === "nullable") {
  // Actual nullable body type (e.g., {@body body: Widget | null})
}
```

**Examples**:

```typespec
// Case 1: Nullable body type
op withNullableBody(): {@body body: Widget | null};
// Result: type.kind === "nullable", optional undefined

// Case 2: Optional response (no body in some cases)
op withOptionalResponse(): Widget | NoContentResponse;
// Result: type.kind === "model", optional === true
```
