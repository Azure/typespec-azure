Azure services should use numeric types that specify the bit-width instead of generic types.

## Impact

- **Area:** SDK, API

Generic numeric types lose precision or cannot be represented by a strong numeric type in language SDKs.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ValidFormats](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2003).

#### ❌ Incorrect

```tsp
model Widget {
  id: integer;
  cost: float;
}
```

#### ✅ Correct

```tsp
model Widget {
  id: safeint;
  cost: float32;
}
```

This includes extending generic numeric types.

#### ❌ Incorrect

```tsp
model GenericInteger extends integer;

model Widget {
  id: GenericInteger;
}
```

#### ✅ Correct

```tsp
model Widget {
  id: safeint;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the defined numeric types for floating-point, fixed-point, or integer values.
