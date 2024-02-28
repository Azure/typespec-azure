---
title: missing-x-ms-identifiers
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers
```

Check that array properties have `x-ms-identifiers` specified with `@OpenAPI.extension`

#### ❌ Incorrect

```tsp
model Address [] {
  city: string;
  street: string;
}

model ResourceProperties {
  array: Address[]
}
```

#### ✅ Correct

```tsp
model ResourceProperties {
  @OpenAPI.extension("x-ms-identifiers", ["city", "street"])
  array: Address[];
}
```
