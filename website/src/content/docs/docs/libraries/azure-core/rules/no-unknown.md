---
title: "no-unknown"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-unknown
```

Azure services must not have properties of type `unknown`. All properties should have well-defined types to ensure proper serialization and client SDK generation.

#### ❌ Incorrect

```tsp
model Widget {
  name: unknown;
}
```

#### ✅ Correct

Use a specific type:

```tsp
model Widget {
  name: string;
}
```

Or use `Record<string>` for arbitrary key-value data:

```tsp
model Widget {
  metadata: Record<string>;
}
```
