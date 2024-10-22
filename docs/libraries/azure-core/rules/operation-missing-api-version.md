---
title: "operation-missing-api-version"
---

```text title="Full name"
@azure-tools/typespec-azure-core/operation-missing-api-version
```

Ensure all operations have an `apiVersion` parameter.

:::warning
Seeing this error is also a sign that you are not using the Azure Standard templates. First double check why you cannot use them.
:::

#### ❌ Incorrect

```tsp
op createPet(pet: Pet): void;
```

### ✅ Correct

```tsp
op createPet(pet: Pet, ...Azure.Core.Foundations.ApiVersionParameter): void;
```
