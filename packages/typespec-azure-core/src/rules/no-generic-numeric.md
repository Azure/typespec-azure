Azure services should use numeric types that specify the bit-width instead of generic types.

## Impact

- **Area:** SDK, API

Generic numeric types lose precision or cannot be represented by a strong numeric type in language SDKs.

## LintDiff Equivalent

This rule is related to the Swagger linter rule [ValidFormats](https://github.com/Azure/azure-openapi-validator/blob/main/docs/valid-formats.md), but enforces a separate numeric precision policy. Generic numeric types can pass `ValidFormats` because that rule accepts schemas without a format and schemas with a recognized format.

This rule does not validate format strings or reject every built-in numeric type whose emitted format is outside the Swagger allowlist. For example, `int8`, `uint32`, and `decimal128` are not prohibited by this rule.

The same requirement applies to array elements, dictionary values (including nested combinations of arrays and records), and inline operation parameters, including query parameters. For example, use `Record<float32>` instead of `Record<decimal>`, and `@query amount: float32` instead of `@query amount: decimal`.

This includes extending generic numeric types.

#### ❌ Incorrect

##### Direct and collection members

```tsp
model Widget {
  id: integer;
  cost: float;
  amounts: decimal[];
  discounts: Record<decimal>;
}
```

##### Derived numeric types

```tsp
model GenericInteger extends integer;

model Widget {
  id: GenericInteger;
}
```

#### ✅ Correct

##### Direct and collection members

```tsp
model Widget {
  id: safeint;
  cost: float32;
  amounts: float32[];
  discounts: Record<float32>;
}
```

##### Derived numeric types

```tsp
model Widget {
  id: safeint;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the defined numeric types for floating-point, fixed-point, or integer values.
