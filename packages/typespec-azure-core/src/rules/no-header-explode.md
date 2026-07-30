Azure services favor serializing header parameter of array type using the simple style(Where each values is joined by a `,`)
Using `explode: true` property specify that each individual value of the array should be sent as a separate header parameter.

## Impact

- **Area:** API

Allowing explode on multi-valued headers is mainly a data-plane concern but should be avoided.

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

## Suppression

Suppress only when required to match an existing API; otherwise use a different separator for multi-valued headers.
