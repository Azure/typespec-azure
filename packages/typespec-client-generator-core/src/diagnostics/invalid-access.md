This diagnostic is issued when the value passed to the `@access` decorator is not one of the allowed access levels.

## Impact

- **Area:** SDK visibility overrides. Blocks the invalid `@access` value from changing generated public/internal visibility.
- **Not affected:** Model structure, operation signatures, and wire payloads are unchanged.

#### ❌ Incorrect Usage

```typespec
enum CustomAccess {
  private: "private",
}
@access(CustomAccess.private)
model SecretModel {}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Access value must be "public" or "internal".
```

#### ✅ How to Fix

Pass `Access.public` or `Access.internal` to `@access` and remove any other enum member or literal value:

```typespec
@access(Access.internal)
model SecretModel {}
```
