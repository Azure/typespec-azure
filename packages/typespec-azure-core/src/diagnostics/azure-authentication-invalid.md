This diagnostic is issued when `@azureServiceConfigurations` declares an invalid endpoint/OAuth configuration catalog.

## Impact

- **Area:** Paired service configurations. Blocks invalid endpoints, authentication requirements, or catalogs missing the required `public` default.
- **Not affected:** Ordinary HTTP server and authentication declarations without this decorator.

## Incorrect Usage

The catalog does not declare the required `public` configuration:

```typespec
model ServiceAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;

model Configurations {
  other: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

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

model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {
  @get op query(): string;
}
```

An empty catalog or a catalog declaring only PascalCase `Public` also fails this check.

The remaining examples assume `using Azure.Core;`, `using TypeSpec.Http;`, and the `ServiceAuth` model shown above.

## Configuration records

Each configuration must be a model record, not a scalar or another type.

Incorrect:

```typespec
model Configurations {
  public: string;
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Each service configuration must be a named endpoint and authentication record.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Configuration names

Names must not be empty or contain only whitespace.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
  ` `: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Each service configuration must be a named endpoint and authentication record.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Known properties

A record accepts only `endpoint`, `authentication`, `parameters`, and `description`.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
    descripton: "Public cloud";
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Unknown service configuration property 'descripton'.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
    description: "Public cloud";
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Endpoint string literals

The endpoint must be a nonempty string literal, not the `string` type.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: string;
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Configuration 'public' must declare a non-empty endpoint string literal.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Required authentication

Every configuration needs an `authentication` property.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Configuration 'public' must declare authentication requirements.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Authentication requirement syntax

Use ordinary HTTP authentication models, OR unions, or AND tuples of models.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: string;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Authentication must be a model, an OR union, or an AND tuple of models.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: [ServiceAuth, ApiKeyAuth<ApiKeyLocation.header, "api-key">] | NoAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Endpoint template parameters

Declare `parameters` as a model containing the endpoint template's parameters, as for `@server`.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://{region}.example.com";
    parameters: string;
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Configuration 'public' parameters must be a model.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://{region}.example.com";
    parameters: {
      region: string;
    };
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Description string literals

The optional `description` must be a string literal.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
    description: string;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Configuration 'public' description must be a string literal.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
    description: "Public cloud";
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## OAuth2 presence

Every configuration must include OAuth2. Key alternatives and AND groups are supported, and configurations may have different authentication requirements.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ApiKeyAuth<ApiKeyLocation.header, "api-key">;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Service configurations must include an OAuth2 authentication scheme.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth | ApiKeyAuth<ApiKeyLocation.header, "api-key">;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

## Conflicting HTTP decorators

Do not combine the pairing decorator with `@server` or `@useAuth` on the same namespace; it calls those HTTP APIs itself.

Incorrect:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@server("https://api.loganalytics.io")
@useAuth(ServiceAuth)
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Reported message: `Do not combine @azureServiceConfigurations with @server or @useAuth on the same namespace.`

Correct:

```typespec
model Configurations {
  public: {
    endpoint: "https://api.loganalytics.io";
    authentication: ServiceAuth;
  };
}

@service
@azureServiceConfigurations(Configurations)
namespace Logs {

}
```

Challenge processing and endpoint-derived audience resolution are outside this feature.
