Azure services favor extensible enums to avoid breaking changes as new enum values are added. TypeSpec enums are closed.
Using a union with the base scalar(`string`, `int32`, `int64`, etc.) as a variant instead of an enum makes it extensible.

## Impact

- **Area:** SDK, API

A closed enum makes it a breaking change to add new values in later api-versions.

#### ❌ Incorrect

```tsp
enum PetKind {
  Cat,
  Dog,
}
```

#### ✅ Correct

```tsp
union PetKind {
  Cat: "Cat",
  Dog: "Dog",
  string,
}
```

Ok. Enum is allowed for versioning purposes.

```tsp
enum Version {
  2021_01_01: "2021-01-01",
  2022_01_01: "2022-01-01",
}
```

## Suppression

Suppress only when the set of values is inherently immutable (e.g. IPv4 vs IPv6). Otherwise use an open union, such as `union These { This: "this", That: "that", string }`.
