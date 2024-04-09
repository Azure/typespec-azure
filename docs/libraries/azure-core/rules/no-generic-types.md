---
title: "no-generic-types"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-generic-types
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
