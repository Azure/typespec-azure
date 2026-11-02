Do not mark a GET SDK operation as long-running with
`Azure.ClientGenerator.Core.Legacy.markAsLro`. GET operations read data;
the Legacy declaration makes the SDK treat that read as an LRO.

This rule checks accepted declarations in any SDK scope and reports once per
operation. Invalid or ineffective markers retain their existing decorator
diagnostics. Native protocol LROs are checked by the ARM `no-get-lro` rule.

## Impact

- **Area:** SDK

Remove the Legacy declaration from reads. Use a supported long-running write or
action template when the operation starts work.

## ❌ Incorrect

```tsp
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  @Azure.ClientGenerator.Core.Legacy.markAsLro
  read is ArmResourceRead<Widget>;
}
```

## ✅ Correct

```tsp
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

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

For an approved compatibility exception, place
`#suppress "@azure-tools/typespec-client-generator-core/no-get-lro" "Approved compatibility exception."`
on the operation before its decorators.

## LintDiff Equivalent

This rule supplies SDK declaration coverage for
[GetOperationMustNotBeLongRunning](https://github.com/Azure/azure-openapi-validator/blob/e1b8b207a196cf2fc288593efec22e6e38ab98d5/docs/get-operation-must-not-be-long-running.md).
The ARM rule supplies native protocol and explicit extension coverage.

This SDK check applies to any accepted language scope, not only one emitter's
output. A false raw LRO flag does not change the accepted SDK designation.
Rules can overlap when an operation has both a Legacy SDK declaration and a raw
LRO extension; compare per-rule diagnostics separately from unique operations.
