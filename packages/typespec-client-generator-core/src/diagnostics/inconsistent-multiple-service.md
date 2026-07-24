This diagnostic is issued when multiple services merged into one `@client` declaration do not have the same server and authentication definitions.

## Impact

- **Area:** Multi-service client merging. Blocks a combined client when merged services do not agree on endpoint or authentication shape.
- **Not affected:** The individual service definitions, servers, and auth settings remain unchanged.

## ❌ Incorrect Usage

```typespec
@service
@server("https://servicea.example.com")
namespace ServiceA {

}

@service
@server("https://serviceb.example.com") // differs from ServiceA server
namespace ServiceB {

}

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
  autoMergeService: true,
})
namespace CombineClient {

}
```

## Diagnostic Message

TCGC reports:

```text
All services must have the same server and auth definitions.
```

## ✅ How to Fix

Make the merged services use matching server and auth definitions, or generate them as separate clients.

```typespec
@service
@server("https://service.example.com")
namespace ServiceA {

}

@service
@server("https://service.example.com")
namespace ServiceB {

}

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
  autoMergeService: true,
})
namespace CombineClient {

}
```
