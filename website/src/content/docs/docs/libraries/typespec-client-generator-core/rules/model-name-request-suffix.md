---
title: model-name-request-suffix
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/model-name-request-suffix
```

Model names should not end with `Request`. The
[Azure SDK for .NET management plane naming convention](https://github.com/Azure/azure-sdk-for-net/blob/main/doc/dev/Mgmt-Naming-Conventions.md)
requires using the `Content` suffix instead. This rule is part of the
`best-practices:csharp` ruleset.

The rule inspects the C#-scoped name of each model (the value of
`@clientName(..., "csharp")` if provided, otherwise the TypeSpec name).
If it ends with `Request`, a warning is emitted suggesting the `Content`
suffix instead.

To fix violations, either rename the model in TypeSpec when the
convention applies cross-language, or use
`@clientName("<Name>Content", "csharp")` to provide a C#-only override
while keeping the original TypeSpec name.

#### ❌ Incorrect

```tsp
model PredictionRequest {
  value: string;
}

model CheckNameAvailabilityRequest {
  name: string;
}
```

#### ✅ Correct (rename in TypeSpec)

```tsp
model PredictionContent {
  value: string;
}

model CheckNameAvailabilityContent {
  name: string;
}
```

#### ✅ Correct (rename for C# only)

```tsp
@clientName("PredictionContent", "csharp")
model PredictionRequest {
  value: string;
}

@clientName("CheckNameAvailabilityContent", "csharp")
model CheckNameAvailabilityRequest {
  name: string;
}
```
