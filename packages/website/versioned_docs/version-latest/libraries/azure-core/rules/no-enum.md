---
title: "no-enum"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-enum
```

Azure services favor extensible enums to avoid breaking changes as new enum values are added. TypeSpec enums are closed.
Using a union with the base scalar(`string`, `int32`, `int64`, etc.) as a variant instead of an enum makes it extensible.

#### ❌ Incorrect

```tsp
enum PetKind {
  Cat,
  Dog,
}
```

#### ✅ Correct

```tsp
union PetKind {
  Cat: "Cat",
  Dog: "Dog",
  string,
}
```
