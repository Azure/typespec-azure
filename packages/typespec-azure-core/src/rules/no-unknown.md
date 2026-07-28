Azure services must not have properties of type `unknown`. All properties should have well-defined types to ensure proper serialization and client SDK generation.

## Impact

- **Area:** API, SDK

Allowing any JSON type makes the API and SDK unusable without extensive documentation.

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

## Suppression

Treat like a type with no schema. Suppress only in the same cases you would accept `additionalProperties`; otherwise use a concrete type.
