---
title: "no-header-explode"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-header-explode
```

Azure services favor serializing header parameter of array type using the simple style(Where each values is joined by a `,`)
Using `explode: true` property specify that each individual value of the array should be sent as a separate header parameter.

#### ❌ Incorrect

```tsp
op list(
  @header(#{ explode: true })
  select: string[],
): Pet[];
```

#### ✅ Correct

```tsp
op list(
  @header
  select: string[],
): Pet[];
```

```tsp
op list(
  @header(#{ explode: false })
  select: string[],
): Pet[];
```
