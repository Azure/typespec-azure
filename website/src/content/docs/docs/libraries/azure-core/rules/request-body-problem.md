---
title: "request-body-problem"
---

```text title="Full name"
@azure-tools/typespec-azure-core/request-body-problem
```

Request body should not be of raw array type. Using an array as the top-level request body prevents adding new properties in the future without introducing breaking changes. Instead, create a container model that wraps the array.

#### ❌ Incorrect

Raw array as request body:

```tsp
op upload(@body body: string[]): string;
```

#### ✅ Correct

Wrap the array in a model:

```tsp
model StringList {
  value: string[];
}

op upload(@body body: StringList): string;
```

:::note
Arrays in _responses_ are allowed since response schemas are less likely to require additive changes.
:::

```tsp
op list(@body body: string): string[];
```
