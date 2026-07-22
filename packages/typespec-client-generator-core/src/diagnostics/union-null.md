This diagnostic is issued when TCGC converts a union whose only possible value is `null`. A union with no non-null alternatives cannot produce a useful SDK type.

## Impact

- **Area:** SDK union type conversion. Generation continues with a fallback union shape, but a null-only union cannot become a useful SDK type.
- **Not affected:** Other nullable unions with non-null variants are unaffected.

#### Diagnostic Message

For the case above, TCGC reports:

```text
Cannot have a union containing only null types.
```

#### ✅ How to Fix

Add at least one non-null variant to the union or remove the union from the generated client surface.

## Suppression

Suppress this warning only if the null-only union is intentionally excluded from usable SDK models and you accept TCGC's fallback representation.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/union-null" "null-only union intentionally not generated"
```
