This diagnostic is issued when `@clientOption` is used without a specific language scope.

## Impact

- **Area:** Language-scoped client options. Generation continues, but an unscoped `@clientOption` may be exposed to emitters that do not understand it.
- **Not affected:** The option name and value are unchanged; only its emitter applicability is in question.

#### ❌ Incorrect Usage

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-option" "temporary workaround"
@clientOption("enableFeatureFoo", true) // missing language scope argument
model Widget {}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@clientOption should be applied with a specific language scope since it is highly likely this is language-specific.
```

#### ✅ How to Fix

Pass the intended language scope as the third argument to `@clientOption`:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-option" "temporary Python workaround"
@clientOption("enableFeatureFoo", true, "python")
model Widget {}
```

## Suppression

Suppress this warning only if the client option is intentionally shared by all emitters rather than scoped to one language.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope" "shared client option for all emitters"
```
