This diagnostic is issued when `@client` is applied to an interface with multiple services in the `service` option.

## Impact

- **Area:** Multi-service client declaration. Blocks using an interface as the root for a client that merges multiple services; only namespaces can represent that structure.
- **Not affected:** The referenced service namespaces remain valid.

## ❌ Incorrect Usage

```typespec
@service namespace ServiceA;
@service namespace ServiceB;

@client({ service: [ServiceA, ServiceB] }) // multiple services are not allowed on an interface client
interface CombinedClient {}
```

## Diagnostic Message

For the declaration above, TCGC reports:

```text
`@client` with multiple services is only allowed on `Namespace`.
```

## ✅ How to Fix

Move the multi-service `@client` declaration to a namespace, or use a single service for an interface client.

```typespec
@service namespace ServiceA;
@service namespace ServiceB;

@client({ service: [ServiceA, ServiceB] })
namespace CombinedClient {}
```
