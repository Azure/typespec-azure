GET operations must not be long-running operations (LROs). Use a non-GET
operation to initiate work, and keep GET operations as synchronous reads.

This rule reports a concrete GET in an HTTP service when the existing LRO
metadata helper recognizes it as long-running. This includes customized
operation templates and polling or result endpoints that expose LRO metadata.
A GET that only returns status data without LRO metadata remains valid.
Explicit LRO flags and options are also checked.

## Impact

- **Area:** API, SDK

A long-running GET can make clients poll a read or continuation as another LRO.
Do not customize a read with a long-running response. Use a standard read
response for GET and an appropriate long-running write or action template for
work that requires polling.

## ❌ Incorrect

The read template is customized with a long-running response.

```tsp
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
}
```

## ✅ Correct

Keep the standard read response.

```tsp
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## Suppression

For an approved compatibility exception, suppress the fully qualified rule on
the operation and document the reason:

```tsp
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/no-get-lro" "Approved compatibility exception."
  read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
}
```

## LintDiff Equivalent

This rule and TCGC's `no-get-lro` jointly provide native guidance related to
[GetOperationMustNotBeLongRunning](https://github.com/Azure/azure-openapi-validator/blob/e1b8b207a196cf2fc288593efec22e6e38ab98d5/docs/get-operation-must-not-be-long-running.md).
ARM checks native protocol metadata and semantic LRO extensions. TCGC checks
accepted SDK-specific `Legacy.markAsLro` declarations.

The native policy is broader than the Swagger check. A GET recognized as an LRO
warns even when its emitted document has no LRO flag. An explicit false extension
does not override native LRO metadata. The extension-only check still requires
exact `true` for `x-ms-long-running-operation`; truthy
`x-ms-long-running-operation-options` independently violates.

ARM reports once per operation even when several checks apply. Both rules can
report an operation that independently has a raw extension and a Legacy SDK
declaration. Diagnostic totals are therefore not necessarily equivalent to
Swagger totals.
