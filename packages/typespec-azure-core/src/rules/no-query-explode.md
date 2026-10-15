Azure services favor serializing query parameter of array type using the simple style(Where each values is joined by a `,`)
Using the `*` uri template modifier or `explode: true` property specify that each individual value of the array should be sent as a separate query parameter.

## Impact

- **Area:** API

Allowing explode on multi-valued query parameters is mainly a data-plane concern but should be avoided.

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

## Suppression

Suppress only when required to match an existing API; otherwise use a different separator for multi-valued query parameters.
