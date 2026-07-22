This diagnostic is issued when a required HTTP parameter is scoped out of the current emitter with `@scope`, leaving the operation without a value it needs. This is usually not allowed.

## Impact

- **Area:** Target-emitter method signatures. Generation continues for that emitter without a required parameter, which can cause runtime failures unless the value is supplied another way.
- **Not affected:** Other emitter scopes and the HTTP parameter definition are unchanged.

#### ❌ Incorrect Usage

```typespec
op getWidget(
  @header("x-client-id")
  @scope("!python")
  clientId: string,
): void;
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Required parameter "requiredHeader" is scoped out for emitter "python". This may cause runtime errors unless the parameter is provided through other means (e.g., custom headers).
```

#### ✅ How to Fix

Keep the required parameter in scope, or — when scoping it out is intentional and the value is supplied another way — confirm the intent and suppress this diagnostic.

## Suppression

Suppress this warning only if the scoped-out required parameter is intentionally supplied another way, such as a custom policy for that emitter.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/required-parameter-scoped-out" "supplied by a custom Python policy"
```
