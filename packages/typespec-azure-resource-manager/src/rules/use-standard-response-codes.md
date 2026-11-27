ARM operations should use standard response codes. Use the standard ARM error response for errors rather than individual error status codes. The rule combines the GET policy and general status-code allowlist with the success-response checks from `arm-delete-operation-response-codes`, `arm-put-operation-response-codes`, and `arm-post-operation-response-codes`.

| Operation           | Required responses                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| GET                 | `200`, optionally `202`.                                                                                                                  |
| Synchronous DELETE  | Exactly `200` and `204`.                                                                                                                  |
| Long-running DELETE | Exactly `202` and `204`.                                                                                                                  |
| PUT                 | Exactly `200` and `201`.                                                                                                                  |
| Synchronous POST    | Exactly `200` or exactly `204`.                                                                                                           |
| Long-running POST   | `202`, optionally `200`. The `202` response must not have a body; a declared `200` response must have a body. No other codes are allowed. |
| Any other operation | Only `200`, `201`, `202`, and `204`.                                                                                                      |

The rule checks operations returned by HTTP service discovery. Every check, including the general allowlist, shares this scope. When `@service` namespaces are declared, operations outside those services, such as global SDK customizations, are not checked. When no `@service` is declared, HTTP service discovery uses the global namespace instead. Unlike the older rules, which checked only registered resource lifecycle operations and actions, the DELETE, PUT, and POST checks also apply to custom HTTP operations in the service, for example an action using the DELETE verb. These checks preserve the old rules' numeric status matching and long-running detection. They take precedence over the general allowlist, so the same invalid response does not produce an additional generic warning.

This rule checks concrete HTTP endpoints across all HTTP methods, including operations in nested namespaces and inherited interfaces. The GET, DELETE, PUT, and POST policies produce at most one warning on the operation, even if multiple statuses are invalid or a required code is also missing. The general allowlist reports one warning for each disallowed status. Distinct endpoints are not collapsed merely because they share a source location. Uninstantiated operation templates are not endpoints.

The rule does not require a provider namespace decorator. All checks treat a singleton status range as equivalent to its literal status; broader ranges are not substitutes for the permitted exact codes.

A GET with only `200` is valid. A `202` response is allowed in addition to `200` without this rule requiring a `Location` header. Error responses are not checked by this rule; use [`missing-error-response`](../missing-error-response) to require them. `Location`-header requirements are checked by their own rules.

This rule is disabled in the Azure resource-manager ruleset, which continues to enable `arm-delete-operation-response-codes`, `arm-put-operation-response-codes`, and `arm-post-operation-response-codes`. When you enable this rule alongside those rules, for example through the ARM library's `all` ruleset, the same DELETE, PUT, or POST violation can be reported by both. Suppressions of the older rule IDs do not suppress this rule.

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

| Swagger validator                                                                                                                                      | Combined native coverage                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [NoErrorCodeResponses](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/no-error-code-responses.ts) | General allowlist of `200`, `201`, `202`, and `204` for other HTTP methods inside services; error responses are not checked.         |
| [GetResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-response-codes.md)                                              | GET operations inside services must include `200` and use only `200` or `202` success codes, with one warning per invalid operation. |
| [DeleteResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-response-codes.md)                                        | Synchronous and long-running DELETE numeric (inside services) response checks; error responses are validated separately.             |
| [PutResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-response-codes.md)                                              | PUT numeric (inside services) response checks; error responses are validated separately.                                             |
| [PostResponseCodes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/post-response-codes.md)                                            | Synchronous and long-running POST numeric (inside services) response and body checks; error responses are validated separately.      |

The rule checks native HTTP endpoints without reproducing SDK-scoped emission
or the general validator's omission of `x-ms-paths` responses. The temporary
lintdiff GET rule uses provider namespace ancestry in its mixed ARM/data-plane
runner; this rule uses HTTP service discovery instead. The rule does not
construct historical API-version projections or claim identical emitted
diagnostic counts.
