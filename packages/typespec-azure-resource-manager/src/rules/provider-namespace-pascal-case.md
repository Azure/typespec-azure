Every provider namespace in an ARM operation path must use PascalCase. This
includes provider namespaces in nested resource paths.

## Impact

- **Area:** API

Incorrect provider namespace casing makes ARM resource paths inconsistent.

## ❌ Incorrect

The provider namespace override uses a lowercase resource provider name:

```typespec
@armProviderNamespace("Microsoft.compute")
namespace Microsoft.Compute;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## ✅ Correct

Use PascalCase for the provider namespace:

```typespec
@armProviderNamespace("Microsoft.Compute")
namespace Microsoft.Compute;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## Suppression

Correct the provider namespace casing when possible. Suppress only for an
approved existing ARM route whose casing cannot change without breaking
compatibility.

## LintDiff Equivalent

This rule corresponds to
[PathResourceProviderNamePascalCase](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-resource-provider-name-pascal-case.md).
The Swagger rule is registered for ARM paths; although its documentation also
mentions data-plane specs, its implementation does not register for them.
