ARM PATCH request body properties must be safe for partial updates. A property emitted in an ARM PATCH body must not:

- Be required.
- Define a default value.
- Be visible only during `Lifecycle.Create` (`@visibility(Lifecycle.Create)`).

## Impact

- **Area:** API

PATCH describes partial updates. Required PATCH body properties, default-valued properties, and create-only properties can make partial updates ambiguous for service authors and SDKs, and can produce ARM OpenAPI that violates PATCH request-body guidance.

The rule checks the effective emitted PATCH payload. Properties omitted from the PATCH payload, such as `never` properties or create-only properties removed by the PATCH visibility transform, are not reported. A top-level emitted property named `identity` is skipped to match ARM PATCH identity envelope behavior.

Property checks apply only to single HTTP bodies. Multipart wrappers and file models describe transport payloads, not properties of a PATCH document, and are not traversed. This does not exempt these operations from other ARM guidelines, including JSON content-type requirements. Ordinary and nullable single-body models retain the same property checks.

## Applicability

Enable this rule for compilations that should follow ARM PATCH guidance. When enabled, it checks PATCH operations in ordinary and nested namespaces, including interfaces, without requiring `@armProviderNamespace`. It does not distinguish ARM and data-plane services within the same compilation.

The shared `@azure-tools/typespec-azure-rulesets/resource-manager` ruleset currently leaves this rule disabled; enable `@azure-tools/typespec-azure-resource-manager/no-unsafe-patch-body-properties` explicitly to use it.

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
