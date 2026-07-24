Key properties need to have an explicit Lifecycle visibility setting. Use the `@visibility` decorator to specify the appropriate visibility for key properties. Without explicit visibility, the key property uses default visibility which may not match the intended behavior.

## Impact

- **Area:** API, SDK

Missing key visibility can misrepresent the mutability of identity fields in the API and generated SDKs.

#### ❌ Incorrect

Key property without explicit visibility:

```tsp
model Foo {
  @key
  name: string;
}
```

#### ✅ Correct

Key property with explicit `Lifecycle.Read` visibility:

```tsp
model Foo {
  @key
  @visibility(Lifecycle.Read)
  name: string;
}
```

## Suppression

Suppress only if an identity field is genuinely mutable; otherwise add a visibility decorator with the appropriate lifecycle visibility.
