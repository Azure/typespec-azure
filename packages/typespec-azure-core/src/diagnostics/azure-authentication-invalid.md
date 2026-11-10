This diagnostic is issued when `@azureServiceConfigurations` declares an invalid endpoint/OAuth configuration catalog.

## Impact

- **Area:** Paired service configurations. Blocks invalid endpoints, authentication requirements, or catalogs missing the required `public` default.
- **Not affected:** Ordinary HTTP server and authentication declarations without this decorator.

## Incorrect Usage

The catalog does not declare the required `public` configuration:

```typespec
model ServiceAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;

const Configurations = #{
  other: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
};

@service
@azureServiceConfigurations(Configurations)
namespace Logs {
  @get op query(): string;
}
```

## Diagnostic Message

Azure Core reports the specific invalid setting. For this example:

```text
Service configurations must declare a 'public' configuration.
```

## How to Fix

Declare a configuration named exactly `public`. It is always the default, regardless of declaration order:

```typespec
model ServiceAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;

const Configurations = #{
  public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
};

@service
@azureServiceConfigurations(Configurations)
namespace Logs {
  @get op query(): string;
}
```

An empty catalog or a catalog declaring only PascalCase `Public` also fails this check.

Use value records (`#{ ... }`), not model declarations, for the catalog and its entries. Reference authentication types with `typeref(...)` and endpoint parameter models with `parameters: typeref(Parameters)`. The compiler checks required properties, property value types, authentication reference constraints, and parameter model constraints; those failures use compiler diagnostics instead of this diagnostic.

Enable the experimental `typeref` feature in the consuming project's `tspconfig.yaml`:

```yaml
kind: project
features:
  - typeref
```

The remaining examples assume imports for `@typespec/http` and `@azure-tools/typespec-azure-core`, `using Azure.Core;`, `using TypeSpec.Http;`, and the `ServiceAuth` model shown above.

## Configuration names

Names must not be empty or contain only whitespace.

Incorrect:

```typespec
@azureServiceConfigurations(#{
  public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
  ` `: #{ endpoint: "https://api.loganalytics.us", authentication: typeref(ServiceAuth) },
})
namespace Logs {

}
```

Reported message: `Each service configuration must have a non-empty name.`

Correct:

```typespec
@azureServiceConfigurations(#{
  public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
  government: #{ endpoint: "https://api.loganalytics.us", authentication: typeref(ServiceAuth) },
})
namespace Logs {

}
```

## Nonempty endpoints

The endpoint must contain a nonempty URL or URL template, as accepted by `@server`.

Incorrect:

```typespec
@azureServiceConfigurations(#{ public: #{ endpoint: "", authentication: typeref(ServiceAuth) } })
namespace Logs {

}
```

Reported message: `Configuration 'public' must declare a non-empty endpoint string.`

Correct:

```typespec
@azureServiceConfigurations(#{
  public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
})
namespace Logs {

}
```

## OAuth2 presence

Every configuration must include OAuth2. API-key alternatives and AND groups are supported, and configurations may have different authentication requirements.

Incorrect:

```typespec
@azureServiceConfigurations(#{
  public: #{
    endpoint: "https://api.loganalytics.io",
    authentication: typeref(ApiKeyAuth<ApiKeyLocation.header, "api-key">),
  },
})
namespace Logs {

}
```

Reported message: `Service configurations must include an OAuth2 authentication scheme.`

Correct:

```typespec
@azureServiceConfigurations(#{
  public: #{
    endpoint: "https://api.loganalytics.io",
    authentication: typeref(ServiceAuth | ApiKeyAuth<ApiKeyLocation.header, "api-key">),
  },
})
namespace Logs {

}
```

## Conflicting HTTP decorators

Do not combine the pairing decorator with `@server` or `@useAuth` on the same namespace; it calls those HTTP APIs itself.

Incorrect:

```typespec
@server("https://api.loganalytics.io")
@useAuth(ServiceAuth)
@azureServiceConfigurations(#{
  public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
})
namespace Logs {

}
```

Reported message: `Do not combine @azureServiceConfigurations with @server or @useAuth on the same namespace.`

Correct:

```typespec
@azureServiceConfigurations(#{
  public: #{ endpoint: "https://api.loganalytics.io", authentication: typeref(ServiceAuth) },
})
namespace Logs {

}
```

Challenge processing and endpoint-derived audience resolution are outside this feature.
