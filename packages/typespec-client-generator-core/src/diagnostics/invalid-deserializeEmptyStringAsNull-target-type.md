This diagnostic is issued when `@deserializeEmptyStringAsNull` is applied to a property whose type is not `string` and is not a scalar derived from `string`.

## Impact

- **Area:** SDK deserialization customization. Blocks empty-string-to-null handling on non-string-like properties.
- **Not affected:** Other properties and the service payload schema are unchanged.

## ❌ Incorrect Usage

```typespec
model Widget {
  @deserializeEmptyStringAsNull
  count: int32; // property type is not `string` or string-derived
}
```

## Diagnostic Message

TCGC reports:

```text
@deserializeEmptyStringAsNull can only be applied to `ModelProperty` of type 'string' or a `Scalar` derived from 'string'.
```

## ✅ How to Fix

Apply the decorator only to a `string` property or a property whose scalar type ultimately extends `string`.

```typespec
model Widget {
  @deserializeEmptyStringAsNull
  name: string;
}
```
