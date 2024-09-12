---
title: "bad-record-type"
---

```text title="Full name"
@azure-tools/typespec-azure-core/bad-record-type
```

Use of `Record<X>` should be limited in Azure services.

1. It is recommended to use `Record<string>` instead of `Record<unknown>`
2. Specifying a type with Record and some known properties is also not recommended.

#### ❌ Incorrect

```tsp
model Pet {
  data: Record<unknown>;
}
```

```tsp
model Pet is Record<string> {
  name: string;
}
```

#### ✅ Correct

```tsp
model Pet {
  tags: Record<string>;
}
```

```tsp
model Pet is Record<string>;
```
