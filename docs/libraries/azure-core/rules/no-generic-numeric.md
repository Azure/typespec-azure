---
title: "no-generic-numeric"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-generic-numeric
```

Azure services should use types which specify the bit-width instead of generic types.

#### ❌ Incorrect

```tsp
model Widget {
  id: integer;
}
```

#### ✅ Correct

```tsp
model Widget {
  id: int32;
}
```
