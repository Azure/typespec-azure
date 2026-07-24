Properties are most often not nullable but optional.
Do not use `| null` to specify that a property is nullable. Instead, use the `?` operator to indicate that a property is optional.

## Impact

- **Area:** API, SDK

A nullable property is usually a mistake where an optional property was intended.

#### ❌ Incorrect

```tsp
model Pet {
  id: string;
  owner: string | null;
}
```

#### ✅ Correct

```tsp
model Pet {
  id: string;
  owner?: string;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use an optional property.
