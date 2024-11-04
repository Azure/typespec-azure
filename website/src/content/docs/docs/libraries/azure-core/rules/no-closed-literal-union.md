---
title: "no-closed-literal-union"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-closed-literal-union
```

Azure services favor extensible enums to avoid breaking changes as new enum values are added. When using a union of only string or numeric literals it is the equivalent to a closed enum.
Adding the base scalar(`string`, `int32`, `int64`, etc.) as a variant to the union makes it extensible.

#### ❌ Incorrect

```tsp
union PetKind {
  Cat: "cat",
  Dog: "dog",
}
```

```tsp
model Pet {
  kind: "cat" | "dog";
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

```tsp
model Pet {
  kind: "cat" | "dog" | string;
}
```
