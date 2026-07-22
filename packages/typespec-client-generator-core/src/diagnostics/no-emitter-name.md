This diagnostic is issued when TCGC cannot determine the emitter's language because no usable emitter name is available (for example, the emitter name is missing or does not match the expected `*-<language>` pattern).

## Impact

- **Area:** TCGC host and tooling configuration. Generation falls back to an unknown emitter scope, which can make language-scoped decorators and names resolve incorrectly.
- **Not affected:** The TypeSpec service model is not changed by the missing option.

#### Diagnostic Message

For the case above, TCGC reports:

```text
Can not find name for your emitter, please check your emitter name.
```

#### ✅ How to Fix

Make sure the emitter is invoked with a resolvable package name (such as `@azure-tools/typespec-csharp`) so TCGC can derive the target language.

## Suppression

Suppress this warning only in tooling or tests that intentionally run TCGC without a real language emitter name.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/no-emitter-name" "test run has no emitter name"
```
