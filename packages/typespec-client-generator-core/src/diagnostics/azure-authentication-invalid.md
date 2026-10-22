This diagnostic is issued when TCGC cannot project an Azure authentication declaration into consistent client metadata.

## Impact

- **Area:** SDK authentication metadata. Blocks a known-audience catalog that cannot project to an SDK enum.
- **Not affected:** The service's wire authentication scheme, ordinary endpoint parameter, and unannotated OAuth or API-key authentication.

## Incorrect Usage

A non-enum alternate type prevents TCGC from representing the known-audience catalog:

```typespec
enum ResourceAudience {
  Public: "https://search.azure.com",
}

@@alternateType(ResourceAudience, string);

@azureTokenAuthentication(#{
  kind: AzureTokenAuthenticationKind.entraDefaultScope,
  defaultAudience: ResourceAudience.Public,
})
model ServiceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;

@service
@useAuth(ServiceAuth)
namespace Search {
  @get op read(): void;
}
```

## Diagnostic Message

TCGC reports:

```text
Cannot project Azure authentication: The known-audience enum must project to an SDK enum.
```

## How to Fix

Remove the non-enum alternate type. Use ordinary SDK naming customization without replacing the catalog:

```typespec
enum ResourceAudience {
  Public: "https://search.azure.com",
}

@@clientName(ResourceAudience, "SearchAudience");

@azureTokenAuthentication(#{
  kind: AzureTokenAuthenticationKind.entraDefaultScope,
  defaultAudience: ResourceAudience.Public,
})
model ServiceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;

@service
@useAuth(ServiceAuth)
namespace Search {
  @get op read(): void;
}
```

Paired endpoint/OAuth catalogs remain client-local on `SdkClientInitializationType.serviceConfigurations`. A child namespace's declaration takes precedence over its SDK parent's catalog, then service defaults, including synthesized and auto-merged children. Authentication is associated by model identity, not matching scope strings. Existing initialization fields describe the catalog's explicit default.

The SDK enum describes known resource values, not a closed native audience input type. Every language consumes the same service declaration; native audience APIs and input compatibility remain emitter-owned.
