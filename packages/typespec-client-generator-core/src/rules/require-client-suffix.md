Top-level client names should end with the `Client` suffix. This convention
makes it clear that a namespace or interface represents a generated SDK
client and provides a consistent experience across emitted languages.

If the underlying TypeSpec name does not end with `Client`, use the
`@client` decorator to provide a client-friendly name.

## Impact

- **Area:** SDK generation. Affects the name of the top-level client type in every emitted language SDK (both data-plane and management-plane).
- **Not affected:** The service definition and the generated wire protocol are unchanged; this is a client-surface naming convention only.

## Severity

`warning` — suppressible. This is a naming-consistency convention rather than a correctness error: the SDK still generates, but the entry-point client will not follow the expected `...Client` naming. Recommended to fix so the SDK stays idiomatic and discoverable.

## Diagnostic message

```text
Client name "MyService" must end with Client. Use @client({name: "...Client"})
```

**What it means:** A top-level client (a namespace or interface treated as a client) has a name that does not end with `Client`.

**Why it matters:** Consumers rely on the `...Client` suffix to discover the entry point of an SDK. A non-standard name makes the generated SDK inconsistent with other Azure SDKs and harder to use.

**Recommended fix:** Rename the namespace/interface so it ends with `Client`, or give it a client-friendly name with `@client({ name: "...Client" })`.

#### ❌ Incorrect

```tsp
@client
namespace MyService;
```

#### ✅ Correct

```tsp
@client
namespace MyServiceClient;
```

#### ✅ Correct (renamed via `@client`)

```tsp
@client({
  name: "MyServiceClient",
})
namespace MyService;
```

## Suppression

Suppress this rule only when a non-standard client name is intentional:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/require-client-suffix" "intentional non-standard client name"
@client
namespace MyService;
```
