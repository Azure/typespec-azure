---
title: "no-generic-numeric"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-generic-numeric
```

Azure services should use numeric types that specify the bit-width instead of generic types.

#### ❌ Incorrect

```tsp
model Widget {
  id: integer;
  cost: float;
}
```

#### ✅ Correct

```tsp
model Widget {
  id: safeint;
  cost: float32;
}
```

This includes extending generic numeric types.

#### ❌ Incorrect

```tsp
model GenericInteger extends integer;

model Widget {
  id: GenericInteger;
}
```

#### ✅ Correct

```tsp
model Widget {
  id: safeint;
}
```
