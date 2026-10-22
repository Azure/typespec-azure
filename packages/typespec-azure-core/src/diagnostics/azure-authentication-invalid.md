This diagnostic is issued when `@azureTokenAuthentication` or `@azureServiceConfigurations` declares invalid Azure authentication settings.

## Impact

- **Area:** Azure authentication declarations. Blocks invalid token profiles or endpoint/OAuth configuration catalogs.
- **Not affected:** Ordinary HTTP authentication without these decorators, including explicit OAuth scope arrays and API-key alternatives.

## Incorrect Usage

The OAuth scope does not match the resource selected by the default audience member:

```typespec
enum ResourceAudience {
  Public: "https://search.azure.com",
}

@azureTokenAuthentication(#{
  kind: AzureTokenAuthenticationKind.entraDefaultScope,
  defaultAudience: ResourceAudience.Public,
})
model ServiceAuth is AadOauth2Auth<["https://search.azure.us/.default"]>;
```

## Diagnostic Message

Azure Core reports the specific invalid setting. For this example:

```text
Every OAuth flow must use the default scope 'https://search.azure.com/.default'.
```

## How to Fix

Keep the existing OAuth declaration and make every flow's effective scopes agree with the selected default resource:

```typespec
enum ResourceAudience {
  Public: "https://search.azure.com",
}

@azureTokenAuthentication(#{
  kind: AzureTokenAuthenticationKind.entraDefaultScope,
  defaultAudience: ResourceAudience.Public,
})
model ServiceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;
```

For other reported reasons, apply the corresponding constraint:

- Target an OAuth authentication model with at least one flow. Ordinary explicit scopes need no Azure token profile.
- Use enum-member references for the profile kind and default audience. The default member identifies the known-resource catalog; all resource values must be nonempty strings without surrounding whitespace. Resource values, including trailing slashes, are preserved exactly when appending `/.default`.
- Declare a nonempty model of named configuration records and select an existing default by name.
- Each configuration needs a nonempty endpoint string literal and ordinary HTTP authentication requirements. Endpoint template parameters use a model, as in `@server`; `description`, when provided, is a string literal.
- Every configuration must include OAuth2 and preserve the same authentication mechanisms and requirement groups. Only OAuth URLs and scopes vary; existing key alternatives and AND groups remain intact.
- Do not combine `@azureServiceConfigurations` with direct `@server` or `@useAuth` declarations on the same namespace. The pairing decorator calls those HTTP APIs itself, exposing all servers and one OR of authentication requirements.

Ordinary OAuth configurations do not require an Entra audience annotation. The known-resource enum does not restrict native audience input. All language emitters consume the same declaration and choose their native audience APIs and compatibility behavior. Challenge processing and endpoint-derived audience resolution are outside this feature.
