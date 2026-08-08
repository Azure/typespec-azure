---
title: lro-response-mismatch
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/lro-response-mismatch
```

Post operations should use the standard `ResourceActionAsync` templates, and if the LRO headers are changed, that change must include the intended final result of the resource action, as shown in the examples below.

## Impact

- **Area:** API, SDK

The long-running operation specifies the wrong return type for the operation. This can break SDKs or make SDKs difficult to use..

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  generate is ArmResourceActionAsync<Employee, GenerateRequest, GenerateResponse>;
}
```

In this case, the default `LroHeaders` has a `FinalResult` of `void`, but the response type is `GenerateResponse`.

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  generate is ArmResourceActionAsync<
    Employee,
    GenerateRequest,
    GenerateResponse,
    LroHeaders = ArmLroLocationHeader<FinalResult = GenerateResponse>
  >;
}
```

Here, the `FinalResult` in the `LroHeaders` matches the response type `GenerateResponse`.

## Suppression

This should not be suppressed unless you have validated the correct return type for the operation in generated SDKs.
