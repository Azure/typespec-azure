This diagnostic is issued when one operation has multiple distinct response body types across its successful responses. Some emitters cannot expose all of those response shapes in a single method return type.

## Impact

- **Area:** SDK method response modeling. Generation continues, but some emitters may be unable to represent every distinct response body type in one method return shape.
- **Not affected:** The service can still declare multiple wire responses.

## Diagnostic Message

TCGC reports:

```text
Multiple response types found in operation getWidget. Some emitters might not support returning all of these response types
```

## ✅ How to Fix

Prefer a single response body model or redesign the responses so all successful response bodies share one SDK shape.

## Suppression

Suppress this warning only if the target emitter is known to handle the operation's multiple response body types correctly.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/multiple-response-types" "emitter supports multiple response bodies"
```
