This diagnostic is issued when TCGC cannot project an Azure authentication declaration into consistent client metadata.

## Impact

- **Area:** SDK authentication metadata. Blocks an unsupported audience-catalog projection or an environment declaration associated with an authentication alternative the client does not use.
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

For an unused environment association, the message identifies the referenced authentication model:

```text
Cannot project Azure authentication: Service environments reference 'ResourceAuth', which is not an authentication alternative of this client.
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

For environment-association errors, pass the exact authentication model used by the client's `@useAuth` declaration. A different model with equivalent OAuth flows is not the same alternative.

Environment data remains client-local. Child clients use their own declarations, then their SDK parents' declarations, then service defaults, including synthesized and auto-merged children. An explicit endpoint overrides an environment endpoint default without changing its audience.

The SDK enum describes known resource values, not a closed native audience input type. Every language consumes the same service declaration; native audience APIs and input compatibility remain emitter-owned.
