ARM PATCH request body properties must be update-safe. A property emitted in an ARM PATCH body must not be required, must not define a default value, and must not be create-only.

## Impact

- **Area:** API

PATCH describes partial updates. Required PATCH body properties, default-valued properties, and create-only properties can make partial updates ambiguous for service authors and SDKs, and can produce ARM OpenAPI that violates PATCH request-body guidance.

The rule checks the effective emitted PATCH payload. Properties omitted from the PATCH payload, such as `never` properties or create-only properties removed by the PATCH visibility transform, are not reported. A top-level emitted property named `identity` is skipped to match ARM PATCH identity envelope behavior.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetPatchBody {
  displayName: string;
  enabled?: boolean = false;

  @visibility(Lifecycle.Create)
  createdBy?: string;
}

@route("/widgets/{name}")
@patch
op update(@path name: string, @body body: WidgetPatchBody): void;
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetPatchBody {
  displayName?: string;
  enabled?: boolean;
}

@route("/widgets/{name}")
@patch
op update(@path name: string, @body body: WidgetPatchBody): void;
```

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PatchBodyParametersSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-body-parameters-schema.md).

## Suppression

Do not suppress this rule for ordinary ARM resource PATCH operations. Fix the PATCH model so updateable properties are optional, do not carry defaults, and exclude create-only properties from the emitted PATCH payload.
