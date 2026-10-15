ARM operations should use only `200`, `201`, `202`, `204`, and `default`
responses. **GET operations inside services must include `200` and may only add
`202` or `default`; `201` and `204` are not allowed on these GET operations.**
Use the standard ARM error response for errors rather than individual error
status codes. Other successful statuses and redirects are also outside the
allowed sets. A singleton status range is equivalent to its literal status;
broader ranges are not substitutes for the permitted exact codes.

This rule checks concrete HTTP endpoints across all HTTP methods, including
operations in nested namespaces and inherited interfaces. An invalid GET inside
a service produces one warning on the operation, even if multiple statuses are
invalid or `200` is also missing. Other operations produce a warning for each
disallowed response status. Distinct endpoints are not collapsed merely because
they share a source location. Uninstantiated operation templates are not endpoints.

The rule is intended for ARM specifications and does not require `@service` or
a provider namespace decorator when explicitly enabled. It also checks operations
outside declared services. The stricter GET contract applies only inside a
service namespace or its descendants, preserving the service boundary of the
consolidated GET check. Outside services, only the general allowlist applies;
for example, an SDK customization operation returning `204` is not subject to
the GET-specific requirement for `200`. The combined rule is registered as
disabled in the Azure resource manager ruleset.

A GET with only `200` is valid. A `202` response is allowed in addition to `200`
without this rule requiring a `Location` header. Default-error-response and
`Location`-header requirements are checked by their own rules.

## Impact

- **Area:** API, SDK

Nonstandard response statuses make ARM APIs inconsistent and can change how
generated clients handle successful and error responses. Standard ARM templates
provide suitable defaults; avoid replacing their error response with a single
status-specific model.

## ❌ Incorrect

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Error = NotFoundResponse>;
}
```

## ✅ Correct

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

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

The rule checks native HTTP endpoints without reproducing SDK-scoped emission
or the general validator's omission of `x-ms-paths` responses. The temporary
lintdiff GET rule uses provider namespace ancestry in its mixed ARM/data-plane
runner; the official GET check uses service ancestry instead. The rule does not
construct historical API-version projections or claim identical emitted
diagnostic counts.
