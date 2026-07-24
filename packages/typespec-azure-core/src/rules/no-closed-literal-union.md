Azure services favor extensible enums to avoid breaking changes as new enum values are added. When using a union of only string or numeric literals it is the equivalent to a closed enum.
Adding the base scalar(`string`, `int32`, `int64`, etc.) as a variant to the union makes it extensible.

## Impact

- **Area:** SDK, API

A closed set of values makes it a breaking change to add new values in later api-versions.

#### ❌ Incorrect

```tsp
union PetKind {
  Cat: "cat",
  Dog: "dog",
}
```

```tsp
model Pet {
  kind: "cat" | "dog";
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

```tsp
model Pet {
  kind: "cat" | "dog" | string;
}
```

## Suppression

Suppress only when the set of values is inherently immutable (e.g. IPv4 vs IPv6). Otherwise use an open union, such as `union These { This: "this", That: "that", string }`.
