---
title: "casing-style"
---

```text title="Full name"
@azure-tools/typespec-azure-core/casing-style
```

Validate names follow the [TypeSpec Style guide](https://typespec.io/docs/next/handbook/style-guide)

#### ❌ Incorrect

```tsp
model pet {}
model pet_food {}
```

```tsp
model Pet {
  Name: string;
}
```

```tsp
op CreatePet(): void;
```

```tsp
interface petStores {}
```

#### ✅ Correct

```tsp
model Pet {}
model PetFood {}
```

```tsp
model Pet {
  name: string;
}
```

```tsp
op createPet(): void;
```

```tsp
interface PetStores {}
```
