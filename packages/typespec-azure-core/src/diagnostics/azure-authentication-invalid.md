This diagnostic is issued when `@azureServiceConfigurations` declares an invalid endpoint/OAuth configuration catalog.

## Impact

- **Area:** Paired service configurations. Blocks invalid endpoints, authentication requirements, or named defaults.
- **Not affected:** Ordinary HTTP server and authentication declarations without this decorator.

## Incorrect Usage

The selected default is not a declared configuration:

```typespec
model ServiceAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;

model Configurations {
  Public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations, "Missing")
namespace Logs {
  @get op query(): string;
}
```

## Diagnostic Message

Azure Core reports the specific invalid setting. For this example:

```text
The default configuration 'Missing' is not declared.
```

## How to Fix

Select an existing configuration by name:

```typespec
model ServiceAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;

model Configurations {
  Public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations, "Public")
namespace Logs {
  @get op query(): string;
}
```

For other reported reasons, apply the corresponding constraint:

- Declare named configuration records and select an existing default by name.
- Each configuration needs a nonempty endpoint string literal and ordinary HTTP authentication requirements. Endpoint template parameters use a model, as in `@server`; `description`, when provided, is a string literal.
- Every configuration must include OAuth2. OAuth flows, URLs, scopes, and authentication requirements may differ between configurations, including API-key alternatives and AND groups.
- Do not combine `@azureServiceConfigurations` with direct `@server` or `@useAuth` declarations on the same namespace. The pairing decorator calls those HTTP APIs itself, exposing all servers and one OR of authentication requirements.

Challenge processing and endpoint-derived audience resolution are outside this feature.
