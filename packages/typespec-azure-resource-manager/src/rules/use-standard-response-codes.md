ARM operations should use standard response codes. Use the standard ARM error response for errors rather than individual error status codes. The rule combines the existing GET policy and general status-code allowlist with the unchanged checks from `arm-delete-operation-response-codes`, `arm-put-operation-response-codes`, and `arm-post-operation-response-codes`.

| Operation                    | Required responses                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET inside a service         | `200`, optionally `202` and `default`.                                                                                                                  |
| Synchronous resource DELETE  | Exactly `200`, `204`, and `default`.                                                                                                                    |
| Long-running resource DELETE | Exactly `202`, `204`, and `default`.                                                                                                                    |
| Resource PUT                 | Exactly `200`, `201`, and `default`.                                                                                                                    |
| Synchronous resource POST    | Exactly `200` and `default`, or `204` and `default`.                                                                                                    |
| Long-running resource POST   | `202` and `default`, optionally `200`. The `202` response must not have a body; a declared `200` response must have a body. No other codes are allowed. |
| Other operations             | Only `200`, `201`, `202`, `204`, and `default`.                                                                                                         |

The DELETE check applies to registered resource lifecycle deletes. The PUT and POST checks apply to registered resource create-or-update operations, updates, and actions with the corresponding HTTP verb. These checks preserve the old rules' exact status matching, required default response, and long-running detection, and report a single diagnostic on the operation. They take precedence over the general allowlist, so the same invalid response does not produce an additional generic warning. Custom PUT, POST, and DELETE operations outside these registered resource roles retain the general allowlist.

This rule checks concrete HTTP endpoints across all HTTP methods, including operations in nested namespaces and inherited interfaces. An invalid GET inside a service produces one warning on the operation, even if multiple statuses are invalid or `200` is also missing. Operations covered only by the general allowlist produce a warning for each disallowed response status. Distinct endpoints are not collapsed merely because they share a source location. Uninstantiated operation templates are not endpoints.

The rule is intended for ARM specifications and does not require `@service` or a provider namespace decorator for the general allowlist. It also checks operations outside declared services. The stricter GET contract applies only inside a service namespace or its descendants. Outside services, an SDK customization operation returning `204` is not subject to the GET-specific requirement for `200`. All checks treat a singleton status range as equivalent to its literal status; broader ranges are not substitutes for the permitted exact codes.

A GET with only `200` is valid. A `202` response is allowed in addition to `200` without this rule requiring a `Location` header. The GET check and general allowlist do not require a default error response; the copied resource DELETE, PUT, and POST checks still do. `Location`-header requirements are checked by their own rules.

The combined rule is enabled in the Azure resource manager ruleset and the ARM library's `all` ruleset. Both rulesets disable the three older rules, which remain available for explicit configuration. Update suppressions for the old rule IDs to `@azure-tools/typespec-azure-resource-manager/use-standard-response-codes`; existing suppressions do not suppress the combined rule.

## Impact

- **Area:** API, SDK

Nonstandard response statuses make ARM APIs inconsistent and can change how
generated clients handle successful and error responses. Standard ARM templates
provide suitable defaults; avoid replacing their error response with a single
status-specific model.

## ❌ Incorrect

Assume `Widget` is already defined. Replacing the standard error response with
`NotFoundResponse` adds a disallowed `404` response.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = NotFoundResponse>;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
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
| [DeleteResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-response-codes.md)                                        | Existing synchronous and long-running resource DELETE response checks.                                                             |
| [PutResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-response-codes.md)                                              | Existing resource PUT response checks.                                                                                             |
| [PostResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/post-response-codes.md)                                            | Existing synchronous and long-running resource POST response and body checks.                                                      |

The rule checks native HTTP endpoints without reproducing SDK-scoped emission
or the general validator's omission of `x-ms-paths` responses. The temporary
lintdiff GET rule uses provider namespace ancestry in its mixed ARM/data-plane
runner; the official GET check uses service ancestry instead. The rule does not
construct historical API-version projections or claim identical emitted
diagnostic counts.
