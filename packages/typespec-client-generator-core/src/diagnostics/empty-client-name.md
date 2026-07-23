This diagnostic is issued when `@clientName` is given an empty or whitespace-only value.

## Impact

- **Area:** SDK naming customization. Generation continues, but the empty `@clientName` override is ignored and the default generated name is used.
- **Not affected:** The target declaration's TypeSpec name and wire representation are unchanged.

#### ❌ Incorrect Usage

```typespec
@clientName(" ") // client name is empty/whitespace
model Widget {}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Cannot pass an empty value to the @clientName decorator
```

#### ✅ How to Fix

Provide a non-empty name to `@clientName` or remove the decorator.

## Suppression

Suppress this warning only if the empty `@clientName` is intentionally ignored and the default generated name is acceptable.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/empty-client-name" "default client name is intentional"
```
