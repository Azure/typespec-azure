---
title: "non-breaking-versioning"
---

```text title="Full name"
@azure-tools/typespec-azure-core/non-breaking-versioning
```

Verify that only backward compatible changes are made to the API.

#### ❌ Incorrect

- Removed

```tsp
model Foo {
  @removed(Versions.v2024_01_01)
  bar: string;
}
```

- Renamed

```tsp
model Foo {
  @renamedFrom(Versions.v2024_01_01, "baz")
  bar: string;
}
```

- Added required property

```tsp
model Foo {
  @added(Versions.v2024_01_01)
  bar: string;
}
```

- Made optional without default

```tsp
model Foo {
  @madeOptional(Versions.v2024_01_01)
  bar: string;
}
```

#### ✅ Correct

- Adding new type

```tsp
@added(Versions.v2024_01_01)
model Foo {}
```

- Adding operation

```tsp
@added(Versions.v2024_01_01)
op foo(): Foo;
```

- Adding optional property

```tsp
model Foo {
  @added(Versions.v2024_01_01)
  bar?: string;
}
```

- Made optional with default

```tsp
model Foo {
  @madeOptional(Versions.v2024_01_01)
  bar?: string = "default";
}
```
