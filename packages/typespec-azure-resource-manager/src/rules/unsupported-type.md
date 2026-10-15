Primitive types currently unsupported in ARM:

- int8
- int16
- uint8
- uint16
- uint32
- uint64

## Impact

- **Area:** SDK

The data type cannot be modeled in SDKs.

## ❌ Incorrect

```tsp
model ResourceProperties {
  count: uint32;
}
```

## ✅ Correct

```tsp
model ResourceProperties {
  count: int32;
}
```

## Suppression

Requires SDK sign-off. Use standard schemas and built-in types.
