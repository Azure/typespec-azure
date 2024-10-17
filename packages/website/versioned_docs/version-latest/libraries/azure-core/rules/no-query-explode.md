---
title: "no-query-explode"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-query-explode
```

Azure services favor serializing query parameter of array type using the simple style(Where each values is joined by a `,`)
Using the `*` uri template modifier or `explode: true` property specify that each individual value of the array should be sent as a separate query parameter.

#### ❌ Incorrect

```tsp
op list(
  @query(#{ explode: true })
  select: string[],
): Pet[];
```

#### ✅ Correct

```tsp
op list(
  @query
  select: string[],
): Pet[];
```

```tsp
op list(
  @query(#{ explode: false })
  select: string[],
): Pet[];
```
