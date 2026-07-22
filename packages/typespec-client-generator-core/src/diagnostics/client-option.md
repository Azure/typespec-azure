This diagnostic is always issued when `@clientOption` is used, because client options are a temporary mechanism intended only for language emitters.

To fix this issue, double-check whether the client option reflects an intended language-emitter behavior. If it does, suppress this diagnostic; otherwise remove `@clientOption`.

### Example

Confirm the option is intentional and suppress the diagnostic:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-option" "preview feature for python"
@clientOption("enableFeatureFoo", true, "python")
model Test {
  id: string;
}
```

`@clientOption` always reports this diagnostic because it is experimental; suppress it when the language behavior is intended, otherwise remove `@clientOption`.
