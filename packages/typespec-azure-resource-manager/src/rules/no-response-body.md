ARM success response bodies must match their HTTP status and operation:

- `202` and `204` responses must have no body.
- `DELETE` responses with status `200` must also have no body.
- Other success responses should have a body, except for `HEAD` operations and `POST` responses with status `200`, which may be bodyless.

Response headers are allowed on bodyless responses. Explicit `@body` and `@bodyRoot` payloads, as well as ordinary response properties that form an implicit payload, count as response bodies.

Use the standard ARM operation and response templates. Customizing their `Response` argument does not exempt an operation from these requirements.

## Impact

- **Area:** API, SDK
- Unexpected bodies on empty success responses make the API contract inconsistent and can lead clients to discard returned data.
- This rule is already enabled in the ARM ruleset. It also checks customized `DELETE` responses; remove a `200` or `204` payload rather than relying on the operation template's default response.

## DELETE responses

The synchronous delete template returns bodyless `200` and `204` responses by default. Keep those defaults instead of adding a payload.

### ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  delete is ArmResourceDeleteSync<
    Widget,
    Response =
      | (ArmDeletedResponse & {
          @body body: string;
        })
      | ArmDeletedNoContentResponse
  >;
}
```

### ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  delete is ArmResourceDeleteSync<Widget>;
}
```

Each response is checked independently. A bodyless `200` response does not exempt a later `202` or `204` response from the empty-body requirement.

## Suppression

Prefer correcting the response with standard templates. Suppression can be appropriate for an existing `202` response whose body must be retained for compatibility; do not suppress a body-bearing `204` response.

Place `#suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "Existing 202 response body retained for compatibility."` directly before the affected operation declaration, inside the interface when applicable.

## LintDiff Equivalent

This rule covers the response-body policy of [`DeleteResponseBodyEmpty`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-response-body-empty.md) for `DELETE` responses with exact status `200` or `204`. Standard delete defaults are compliant, but supported `Response` customizations can introduce a body and are checked as well.

The TypeSpec rule retains its warning severity and existing ARM enablement; the Swagger linter reports an error. It reports once per violating status on the authored operation, rather than once per response-schema occurrence. Its existing `202`, non-`DELETE` `204`, and other success-response checks are broader than this mapping.
