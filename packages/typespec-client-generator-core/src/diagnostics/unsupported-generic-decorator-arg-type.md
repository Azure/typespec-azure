This diagnostic is issued when TCGC tries to parse a generic decorator argument whose TypeSpec kind is unsupported.

## Impact

- **Area:** Decorator metadata emitted for SDK types. Generation continues, but the unsupported decorator argument is omitted from the metadata available to emitters.
- **Not affected:** The decorator's compile-time effect on the TypeSpec program has already occurred.

## Diagnostic Message

For the case above, TCGC reports:

```text
Can not parse the arg type for decorator "@service".
```

## ✅ How to Fix

Use supported decorator argument values such as strings, numbers, booleans, values, or enum members.

## Suppression

Suppress this warning only if the decorator argument metadata is optional for the target emitter and may be safely omitted.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/unsupported-generic-decorator-arg-type" "decorator metadata not needed"
```
