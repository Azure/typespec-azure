This diagnostic is always issued when `@clientOption` is used, because client options are a temporary mechanism intended only for language emitters.

## Impact

- **Area:** Targeted language-emitter options. Generation can proceed only with an explicit suppression acknowledging that `@clientOption` is a temporary emitter-specific workaround.
- **Not affected:** The TypeSpec service model and wire protocol are unchanged.

#### ❌ Incorrect Usage

```typespec
@clientOption("enableFeatureFoo", true, "python") // ❌ experimental client option must be suppressed
model Test {
  id: string;
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@clientOption is experimental and should only be used for temporary workarounds. This usage must be suppressed.
```

#### ✅ How to Fix

Double-check whether the client option reflects an intended language-emitter behavior. If it does, suppress this diagnostic; otherwise remove `@clientOption`.

## Suppression

Suppress this warning only when `@clientOption` is a deliberate temporary workaround for a specific language emitter.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-option" "preview feature for python"
```
