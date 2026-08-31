This diagnostic is issued when a TCGC decorator that requires a language scope is used without one, or with an invalid scope.

## Impact

- **Area:** Language-scoped decorator behavior. The decorator may apply globally or to unintended emitters without a proper scope.
- **Decorators checked:**
  - `@convenientAPI` — must be scoped to `"java"` and/or `"csharp"` (both `true` and `false` values require a scope)
  - `@protocolAPI` — must be scoped to `"java"` and/or `"csharp"` (both `true` and `false` values require a scope)
  - `@clientOption` — must be scoped to any specific language

## ❌ Incorrect Usage

```typespec
// @convenientAPI without scope or with wrong scope
@convenientAPI(true)
op myOperation(): void;

@convenientAPI(true, "python")
op anotherOperation(): void;

@convenientAPI(false)
op yetAnotherOperation(): void;

// @clientOption without scope
#suppress "@azure-tools/typespec-client-generator-core/client-option" "temporary workaround"
@clientOption("enableFeatureFoo", true)
model Widget {}
```

## Diagnostic Message

TCGC reports:

```text
@convenientAPI should be applied with a language scope of "java" or "csharp".
@protocolAPI should be applied with a language scope of "java" or "csharp".
@clientOption should be applied with a language scope of a language scope.
```

## ✅ How to Fix

Provide the correct language scope:

```typespec
@convenientAPI(true, "java")
op myOperation(): void;

@convenientAPI(true, "csharp")
op anotherOperation(): void;

@convenientAPI(false, "java")
op yetAnotherOperation(): void;

@protocolAPI(true, "java")
op protocolOperation(): void;

#suppress "@azure-tools/typespec-client-generator-core/client-option" "temporary workaround"
@clientOption("enableFeatureFoo", true, "python")
model Widget {}
```

## Suppression

Suppress this warning only if the decorator is intentionally shared by all emitters rather than scoped to one language.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/decorator-requires-scope" "intentionally global"
@convenientAPI(true)
op myOperation(): void;
```
