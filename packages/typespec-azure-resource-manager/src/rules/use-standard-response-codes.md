ARM operations should use only `200`, `201`, `202`, `204`, and `default`
responses. Use the standard ARM error response for errors rather than individual
error status codes. Other successful statuses, redirects, and status-code ranges
are also outside this allowed set.

This rule checks concrete HTTP endpoints across all HTTP methods, including
operations in nested namespaces and inherited interfaces. Each disallowed
response status produces a warning on the operation. Distinct endpoints or
statuses are not collapsed merely because they share a source location.
Uninstantiated operation templates are not endpoints.

The rule is intended for ARM specifications and does not require a provider
namespace decorator when explicitly enabled. It is registered as disabled in
the Azure resource manager ruleset.

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

This rule corresponds to
[NoErrorCodeResponses](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/no-error-code-responses.ts).
It checks native HTTP endpoints without reproducing SDK-scoped emission or the
validator's omission of `x-ms-paths` responses. It does not construct historical
API-version projections.
