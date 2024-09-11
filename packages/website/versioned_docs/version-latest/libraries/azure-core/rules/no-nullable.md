---
title: "no-nullable"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-nullable
```

Properties are most often not nullable but optional.
Do not use `| null` to specify that a property is nullable. Instead, use the `?` operator to indicate that a property is optional.

#### ❌ Incorrect

```tsp
model Pet {
  id: string;
  owner: string | null;
}
```

#### ✅ Correct

```tsp
model Pet {
  id: string;
  owner?: string;
}
```
