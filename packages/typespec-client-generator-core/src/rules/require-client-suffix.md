This convention makes it clear that a namespace or interface represents a generated SDK client and provides a consistent experience across emitted languages.

If the underlying TypeSpec name does not end with `Client`, use the `@client` decorator to provide a client-friendly name.

## Impact

- **Area:** SDK generation. Affects the name of the top-level client type in every emitted language SDK (both data-plane and management-plane).
- **Not affected:** The service definition and the generated wire protocol are unchanged; this is a client-surface naming convention only.

## ❌ Incorrect Usage

```tsp
@client
namespace MyService;
```

## Diagnostic Message

For the client above, the linter reports that the client name does not end with `Client`:

```text
Client name "MyService" must end with Client. Use @client({name: "...Client"})
```

## ✅ How to Fix

Rename the namespace or interface so it ends with `Client`:

```tsp
@client
namespace MyServiceClient;
```

Or give it a client-friendly name with `@client`:

```tsp
@client({
  name: "MyServiceClient",
})
namespace MyService;
```

## Suppression

This rule is a `warning` and can be suppressed. Suppress it only when the non-standard client name is intentional and you accept that the generated SDK entry point will not follow the `...Client` convention:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/require-client-suffix" "intentional non-standard client name"
@client
namespace MyService;
```
