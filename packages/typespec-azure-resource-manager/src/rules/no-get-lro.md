GET operations read a resource or report the status of existing work. Do not
explicitly declare a GET long-running. A GET can return an accepted response,
polling headers or an operation status without being declared an LRO.

This opt-in rule reports once per concrete GET in an HTTP service when it has an
effective explicit long-running operation (LRO) declaration for AutoRest:

- An accepted `Azure.ClientGenerator.Core.Legacy.markAsLro` declaration whose
  scope includes `@azure-tools/typespec-autorest`.
- A semantic `x-ms-long-running-operation` extension set to exactly `true`.
- A truthy `x-ms-long-running-operation-options` extension.

An explicit flag value overrides a compatibility declaration. Options remain
independently forbidden. Protocol and polling metadata alone never cause a
warning. Standard read and polling templates remain valid. Non-service helpers,
non-GET operations and uninstantiated templates are not checked. If no service is
declared, the HTTP library's global service fallback applies.

The ARM library `all` ruleset and the Azure resource-manager ruleset leave this
rule disabled. Enable it explicitly:

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-resource-manager/no-get-lro": true
```

## Impact

- **Area:** API, SDK

Declaring a GET long-running makes clients treat a read or continuation as an
LRO. Use the supported ARM operation templates without adding an LRO declaration
to a read. Use the appropriate long-running write or action template for an LRO.

## ❌ Incorrect

The read template has an explicit LRO declaration.

```tsp
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/openapi";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  @OpenAPI.extension("x-ms-long-running-operation", true)
  read is ArmResourceRead<Widget>;
}
```

## ✅ Correct

Remove the declaration. Accepted responses and polling headers, when needed for
a continuation, do not require declaring the GET long-running.

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

Prefer removing the LRO declaration. For an approved
compatibility exception, suppress the fully qualified rule on the operation
and document the reason:

```tsp
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/openapi";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/no-get-lro" "Approved compatibility exception."
  @OpenAPI.extension("x-ms-long-running-operation", true)
  read is ArmResourceRead<Widget>;
}
```

## LintDiff Equivalent

This rule provides GET-specific native authoring guidance for
[GetOperationMustNotBeLongRunning](https://github.com/Azure/azure-openapi-validator/blob/e1b8b207a196cf2fc288593efec22e6e38ab98d5/docs/get-operation-must-not-be-long-running.md).
The Swagger rule reports GET
operations whose `x-ms-long-running-operation` is exactly `true` or whose
`x-ms-long-running-operation-options` fails Spectral's `falsy` check. Both fields
can produce separate diagnostics; `false` and absent LRO flags are valid.

The native rule reports one operation even when both extension branches apply.
It reads semantic declarations, not emitted Swagger. AutoRest already omits
ordinary Core-derived LRO flag/options on GET; that prevention does not cover
accepted SDK compatibility declarations or explicit extensions.

The ARM audience also enables Core's broader `no-legacy-usage` and
`no-openapi-client-extensions` policies. Those warn on Legacy and raw-extension
authoring beyond GET, regardless of effective scope or extension value. This
GET-specific rule remains independently applicable when a service has an
approved Legacy waiver. The frozen migration examples contain actual Legacy
waivers; waivers do not establish GET compliance. Scope, service membership,
source/API-version projection and warning multiplicity must be considered
separately before claiming diagnostic correspondence.
