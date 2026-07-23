This diagnostic is issued when `@alternateType` is applied to a scalar source type with a non-scalar alternate type.

## Impact

- **Area:** SDK type substitution. Blocks an invalid `@alternateType` replacement that would change a scalar into a non-scalar SDK type.
- **Not affected:** The source scalar and its wire encoding remain unchanged.

#### ❌ Incorrect Usage

```typespec
scalar storageDateTime extends utcDateTime;
model DateWrapper {
  value: string;
}
@@alternateType(storageDateTime, DateWrapper); // scalar source cannot use a model alternate type
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Invalid alternate type. If the source type is Scalar, the alternate type must also be Scalar. Found alternate type kind: 'Model'
```

#### ✅ How to Fix

Use a scalar alternate type when the source is a scalar, or apply `@alternateType` to a non-scalar source when replacing it with a non-scalar shape:

```typespec
scalar clientDateTime extends string;
@@alternateType(storageDateTime, clientDateTime);
```
