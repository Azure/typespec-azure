---
title: lro-response-mismatch
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/lro-response-mismatch
```

Post operations should use the standard `ResourceActionAsync` templates, and if the LRO headers are changed, that change must include the intended final result of the resource action, as shown in the examples below.

## Impact

- **Area:** API, SDK

The long-running operation encodes a final result type that does not match its response. This produces an incorrect `final-state-schema` in the emitted OpenAPI and causes generated SDK pollers to return the wrong type when the operation completes.

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

Suppress only when required to match an existing API; otherwise set the intended `FinalResult` in the operation's `LroHeaders` so that it matches the response type.
