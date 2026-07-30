Prefer using `utcDateTime` when representing a datetime unless an offset is necessary. Most Azure services work with UTC times and `offsetDateTime` adds unnecessary complexity.

## Impact

- **Area:** SDK, API

Times are clearest when expressed in UTC; `offsetDateTime` obscures intent.

#### ❌ Incorrect

As a model property:

```tsp
model Bar {
  prop: offsetDateTime;
}
```

As an operation return type:

```tsp
op getTimestamp(): offsetDateTime;
```

As a union variant:

```tsp
union TimeValue {
  a: offsetDateTime,
}
```

As a scalar extension:

```tsp
scalar myDateTime extends offsetDateTime;
```

#### ✅ Correct

```tsp
model Bar {
  prop: utcDateTime;
}
```

```tsp
op getTimestamp(): utcDateTime;
```

## Suppression

Suppress when there is a clear rationale for `offsetDateTime`; otherwise use `utcDateTime`.
