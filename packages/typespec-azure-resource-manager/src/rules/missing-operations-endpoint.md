All Azure Resource Manager services must expose the operations endpoint. Add the Operations interface to your service namespace.

## Impact

- **Area:** API

The service is missing the standard Operations endpoint required by the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [OperationsAPIImplementation](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3023).

## ❌ Incorrect

```tsp title="main.tsp"
@armProviderNamespace
namespace MyService;
```

## ✅ Correct

```tsp title="main.tsp"
@armProviderNamespace
namespace MyService;

interface Operations extends Azure.ResourceManager.Operations {}
```

## Suppression

A few specs may legitimately not need this; otherwise use the standard Operations template.
