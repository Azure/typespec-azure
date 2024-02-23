---
title: avoid-additional-properties
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/avoid-additional-properties
```

ARM requires Resource provider teams to define types explicitly. This is to ensure good customer experience in terms of the discoverability of concrete type definitions.

#### ❌ Incorrect

```tsp
model Address extends Record<string> {}
```

#### ✅ Correct

```tsp
model Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```
