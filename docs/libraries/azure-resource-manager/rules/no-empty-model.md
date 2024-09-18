---
title: no-empty-model
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-empty-model
```

ARM Properties with type:object that don't reference a model definition are not allowed. ARM doesn't allow generic type definitions as this leads to bad customer experience.

#### ❌ Incorrect

```tsp
model Information {
  address: {};
}
```

#### ❌ Incorrect

```tsp
model Empty {}
```

#### ✅ Correct

```tsp
model Information {
  address: Address;
}

model Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

#### ✅ Correct

```tsp
model Information {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```
