---
title: "key-visibility-required"
---

```text title="Full name"
@azure-tools/typespec-azure-core/key-visibility-required
```

Key properties need to have an explicit Lifecycle visibility setting. Use the `@visibility` decorator to specify the appropriate visibility for key properties. Without explicit visibility, the key property uses default visibility which may not match the intended behavior.

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
