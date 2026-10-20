This diagnostic is issued when `@azureTokenAuthentication` or `@azureServiceEnvironments` declares invalid Azure authentication settings.

## Impact

- **Area:** Azure authentication declarations. Blocks invalid token profiles or environment bindings from being used to generate authentication metadata.
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
- Give a challenge profile a nonempty runtime contract, rather than an audience or invented fixed scopes.
- Reference members of the authentication model's audience enum in environment bindings. A member of a different enum is not interchangeable even if its name or resource value matches.
- Use absolute HTTP(S) environment endpoints without credentials or fragments. A default environment must exist and select the authentication model's default audience.
- Declare environments only once per target and authentication model. Explicit client endpoints override environment defaults; selecting an audience alone never derives or rewrites an endpoint.

The known-resource enum does not restrict native audience input. All language emitters consume the same declaration and choose their native audience APIs and compatibility behavior.
