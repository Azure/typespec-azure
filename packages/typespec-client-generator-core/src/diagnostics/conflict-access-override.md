This diagnostic is issued when an `@access` override conflicts with access already calculated from an operation or another `@access` override.

## Impact

- **Area:** Generated SDK visibility. Generation continues using the access level TCGC calculated from operations or earlier overrides, so the conflicting override may not hide the type.
- **Not affected:** Serialization, wire payloads, and service routes are unchanged.

#### ❌ Incorrect Usage

```typespec
@access(Access.internal) // conflicts with public access inferred from `op test`
model A {}

op test(@body body: A): void;
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@access override conflicts with the access calculated from operation or other @access override.
```

#### ✅ How to Fix

Align access settings so each generated type has one consistent access level, or remove the conflicting override.

```typespec
@access(Access.internal)
model A {}

@access(Access.internal)
op test(@body body: A): void;
```

## Suppression

Suppress this warning only if the public exposure is intentional and the conflicting `@access` override is kept for another emitter or compatibility reason.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/conflict-access-override" "public exposure is intentional"
```
