---
title: "no-case-mismatch"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-case-mismatch
```

Validate that no two types have the same name with different casing. Having types that differ only by casing can cause issues in case-insensitive languages and is generally confusing. This applies to models, enums, and unions.

:::note
Template instances are not checked by this rule since they are not distinct type declarations.
:::

#### ❌ Incorrect

Two models that differ only by casing:

```tsp
model FailOverProperties {
  priority: int32;
}

model FailoverProperties {
  priority: int32;
}
```

Multiple types with case variations:

```tsp
model FailOverProperties {}
model FailoverProperties {}
model Failoverproperties {}
```

#### ✅ Correct

Types with meaningfully different names:

```tsp
model FailedOver {
  status: string;
}

model FailOver {
  priority: int32;
}
```
