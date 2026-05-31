---
title: post-lro-response-mismatch
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-post-lro-response-mismatch
```

Ensure that the final result of a long-running POST operation matches the response.

When checking POST operations that are long-running:

- If the operation responses include a 200 response, the non-void body type should match the `FinalResult` of the LRO. A void body type or absence of a body type indicates the `FinalResult` should be `void`.
- If the operation responses include a 204 response and do not contain a 200 response, the `FinalResult` should be `void`.
- If the operation responses include both a 200 response with a void or empty body and a 204 response, the `FinalResult` should be `void`.
- If the operation responses include both a 200 response with a non-empty body and a 204 response, this is a conflicting configuration — a POST should not contain both a 204 (NoContent) response and a 200 (OK) response with a non-empty body.
- If the only 2XX response is a 202 (Accepted), the rule checks whether the operation is a template instantiation of `Azure.ResourceManager.ActionAsync` and verifies the `Response` parameter matches the `FinalResult`.

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
