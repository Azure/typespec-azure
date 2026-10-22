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

For Azure authentication, matching default OAuth scopes is not sufficient: merged services must also agree on Entra profile presence, the default audience member, all known audience resources, and any endpoint/OAuth catalog. Catalogs must have matching names, defaults, endpoint templates/parameter defaults, and per-configuration authentication. Identical flat HTTP servers and auth alternatives do not establish identical pairings. Separate auth models or enums may be used when their settings are equivalent.

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
