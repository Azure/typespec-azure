ARM POST operations should pass request-specific input in the request body, not
as query parameters. Keeping POST inputs in the payload gives SDKs a stable
request shape and keeps ARM APIs consistent with Azure Resource Manager RPC
guidelines.

Only the standard `api-version` query parameter is allowed.

## Impact

- **Area:** API, SDK

Extra query parameters on ARM POST operations violate the ARM POST request
contract and can lead to inconsistent generated SDK method signatures.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule
[ParametersInPost](https://github.com/Azure/azure-openapi-validator/blob/main/docs/parameters-in-post.md).

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model ActionRequest {
  value: string;
}

model ActionResponse {
  result: string;
}

model ActionParameters {
  @query mode?: string;
}

@armResourceOperations
interface Widgets {
  doAction is ArmResourceActionSync<
    Widget,
    ActionRequest,
    ActionResponse,
    Foundations.DefaultBaseParameters<Widget>,
    Parameters = ActionParameters
  >;
}
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model ActionRequest {
  mode?: string;
  value: string;
}

model ActionResponse {
  result: string;
}

@armResourceOperations
interface Widgets {
  doAction is ArmResourceActionSync<Widget, ActionRequest, ActionResponse>;
}
```
