This diagnostic is issued when a required HTTP parameter is scoped out of the current emitter with `@scope`, leaving the operation without a value it needs. This is usually not allowed.

To fix this issue, keep the required parameter in scope, or — when scoping it out is intentional and the value is supplied another way — confirm the intent and suppress this diagnostic.

### Example

When scoping the required parameter out is intentional and the value is supplied another way, suppress the diagnostic:

```typespec
op getWidget(
  #suppress "@azure-tools/typespec-client-generator-core/required-parameter-scoped-out" "supplied by a custom Python policy"
  @header("x-client-id")
  @scope("!python")
  clientId: string,
): void;
```

When generating for Python, the required `clientId` header is scoped out; keep it in scope, or suppress the diagnostic when the value is supplied another way.
