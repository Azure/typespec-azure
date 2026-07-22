This diagnostic is issued when TCGC encounters a TypeSpec type kind that it does not know how to convert into an SDK type. The value is treated as an unknown SDK type.

## Impact

- **Area:** SDK type conversion. Generation continues with an unknown SDK type placeholder for the unsupported TypeSpec kind.
- **Not affected:** Other supported TypeSpec types are converted normally.

#### Diagnostic Message

For the case above, TCGC reports:

```text
Unsupported kind TemplateParameter
```

#### ✅ How to Fix

Replace the unsupported construct with a supported model, scalar, enum, union, operation, or model property shape.

## Suppression

Suppress this warning only if the unsupported TypeSpec kind is not part of the public generated SDK surface or an unknown SDK type is acceptable.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/unsupported-kind" "unsupported kind is not emitted"
```
