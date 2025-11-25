---
title: missing-x-ms-identifiers
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers
```

Array of models must explicity define which keys are used as identifiers using the `@identifiers` decorator.

#### ❌ Incorrect

```tsp
model Address {
  city: string;
  street: string;
}

model ResourceProperties {
  array: Address[];
}
```

#### ✅ Correct

```tsp
model ResourceProperties {
  @identifiers(#["city", "street"])
  array: Address[];
}
```
