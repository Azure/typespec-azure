This diagnostic is issued when `@convenientAPI` is used without a specific language scope.

## Impact

- **Area:** Convenience method generation. An unscoped `@convenientAPI` applies globally to all language emitters, which is typically unintended since convenience API generation behavior should be language-specific.
- **Not affected:** The value (true/false) is unchanged; only its emitter applicability is in question.

## ❌ Incorrect Usage

```typespec
@convenientAPI(true) // missing language scope argument
op myOperation(): void;
```

## Diagnostic Message

TCGC reports:

```text
@convenientAPI should be applied with a specific language scope since it is highly likely this is language-specific.
```

## ✅ How to Fix

Pass the intended language scope as the second argument to `@convenientAPI`:

```typespec
@convenientAPI(true, "java")
op myOperation(): void;

@convenientAPI(false, "csharp")
op anotherOperation(): void;
```

## Suppression

Suppress this warning only if you intentionally want the decorator to apply globally to all emitters:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/convenient-api-requires-scope" "intentionally global"
@convenientAPI(true)
op myOperation(): void;
```
