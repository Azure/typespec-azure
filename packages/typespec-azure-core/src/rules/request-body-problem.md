Request body should not be of raw array type. Using an array as the top-level request body prevents adding new properties in the future without introducing breaking changes. Instead, create a container model that wraps the array.

## Impact

- **Area:** API, SDK

A request body typed as a bare array is difficult to evolve, since new properties cannot be added later.

#### ❌ Incorrect

Raw array as request body:

```tsp
op upload(@body body: string[]): string;
```

#### ✅ Correct

Wrap the array in a model:

```tsp
model StringList {
  value: string[];
}

op upload(@body body: StringList): string;
```

:::note
Arrays in _responses_ are allowed since response schemas are less likely to require additive changes.
:::

```tsp
op list(@body body: string): string[];
```

## Suppression

Suppress for actions where an array body is appropriate; otherwise wrap the array in a keyed model property so new properties can be added in the future.
