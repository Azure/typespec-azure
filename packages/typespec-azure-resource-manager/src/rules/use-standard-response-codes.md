ARM operations should use only `200`, `201`, `202`, `204`, and `default`
responses. Use the standard ARM error response rather than individual error
status codes. A singleton status range is equivalent to its literal status;
broader ranges are not substitutes for exact status codes.

- **GET inside a service:** Include `200` and only add `202` or `default`.
- **Synchronous PATCH in an ARM provider:** Return exactly `200` and the
  standard error response (`default`).
- **Long-running PATCH in an ARM provider:** Return exactly `200`, `202`, and
  the standard error response (`default`). The `202` response must not have a
  body. Define native polling metadata to identify the operation as long-running.

These requirements apply to concrete HTTP operations, including operations in
nested namespaces and inherited interfaces. An invalid method-specific response
set produces one warning on the operation. Other operations, including GET
outside a service and PATCH outside an ARM provider, follow the general
allowlist and produce a warning for each disallowed response status. The rule
remains disabled in the Azure resource manager ruleset.

A GET with only `200` is valid. A `202` response is allowed in addition to `200`
without this rule requiring a `Location` header. Default-error-response and
`Location`-header requirements are checked by their own rules.

The `no-response-body` rule can also warn about a `202` body when both rules
are enabled.

## Impact

- **Area:** API, SDK

Nonstandard response statuses make ARM APIs inconsistent and can change how
generated clients handle successful and error responses. Standard ARM templates
provide suitable defaults; avoid replacing their error response with a single
status-specific model.

## ❌ Incorrect

### GET with an explicit error status

Assume `Widget` is already defined. Replacing the standard error response with
`NotFoundResponse` adds a disallowed `404` response.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = NotFoundResponse>;
}
```

### Synchronous PATCH without a standard error response

Assume `Widget` is an ARM resource in the provider namespace.

```tsp
@patch
op update(): ArmResponse<Widget>;
```

## ✅ Correct

### GET with a standard error response

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

### Synchronous and long-running PATCH

Assume `Widget` and `WidgetPatch` are already defined in the provider namespace.
Choose the template that matches the operation's runtime behavior.

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchSync<Widget, WidgetPatch>;
}
```

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<Widget, WidgetPatch>;
}
```

## Suppression

Prefer the standard responses for new APIs. Suppression can be appropriate for
an existing, ARM-reviewed contract whose response statuses cannot change without
breaking compatibility. Apply
`#suppress "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes" "Existing ARM-reviewed response contract retained for backward compatibility."`
to the concrete operation, not its reusable template.

## LintDiff Equivalent

| Swagger validator                                                                                                                                      | Combined native coverage                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [NoErrorCodeResponses](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/no-error-code-responses.ts) | General allowlist of `200`, `201`, `202`, `204`, and `default` across HTTP methods, including operations outside services.         |
| [GetResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-response-codes.md)                                              | GET operations inside services must include `200` and use only `200`, `202`, or `default`, with one warning per invalid operation. |
| [PatchResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-response-codes.md)                                          | Exact response sets for synchronous and long-running ARM PATCH, and no body on a long-running `202`.                               |
| [LroPatch202](https://github.com/Azure/azure-openapi-validator/blob/main/docs/lro-patch202.md)                                                         | A long-running ARM PATCH must include `202`.                                                                                       |

The rule checks native HTTP endpoints without reproducing SDK-scoped emission
or the general validator's omission of `x-ms-paths` responses. The temporary
lintdiff GET rule uses provider namespace ancestry in its mixed ARM/data-plane
runner; the official GET check uses service ancestry instead. The rule does not
construct historical API-version projections or claim identical emitted
diagnostic counts.

An OpenAPI long-running extension or legacy `markAsLro` marker alone does not
provide native polling metadata. This rule does not validate OpenAPI
long-running operation options.
