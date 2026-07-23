This diagnostic is issued when `@markAsLro` is applied to an operation that does not return a non-error model response.

## Impact

- **Area:** Legacy LRO SDK metadata. Generation continues with the operation treated as a regular method because no model response is available for forced LRO metadata.
- **Not affected:** The service operation's HTTP behavior and response type are unchanged.

#### ❌ Incorrect Usage

```typespec
@markAsLro
@post
op start(): string; // ❌ LRO marker requires a model response
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@markAsLro decorator can only be applied to operations that return a model. We will ignore this decorator.
```

#### ✅ How to Fix

Apply `@markAsLro` only to operations that return a model, or remove the decorator.

## Suppression

Suppress this warning only if the operation should remain a regular non-LRO method and the legacy `@markAsLro` annotation is intentionally ignored.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/invalid-mark-as-lro-target" "regular operation despite legacy LRO marker"
```
