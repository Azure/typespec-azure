---
title: unsupported-types
---

```text title=- Full name-
@azure-tools/typespec-azure-core/unsupported-types
```

Check the ARM specification is not using types not supported in ARM.

Primitive types currently unsupported in ARM:

- int8
- int16
- uint8
- uint16
- uint32
- uint64

#### ❌ Incorrect

```tsp
model ResourceProperties {
  count: uint32;
}
```

#### ✅ Correct

```tsp
model ResourceProperties {
  count: int32;
}
```
