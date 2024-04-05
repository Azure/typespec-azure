---
title: "use-standard-integer"
---

```text title="Full name"
@azure-tools/typespec-azure-core/use-standard-integer
```

Azure services favor the standard types int32 and int64 (or safeint) when generating code using Autorest.

#### ❌ Incorrect

```tsp
model Widget {
  id: int8;
}
```

#### ✅ Correct

```tsp
model Widget {
  id: int32;
}
```
