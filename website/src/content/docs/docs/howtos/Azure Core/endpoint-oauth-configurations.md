---
title: Pair Endpoints with OAuth Configurations
llmstxt: true
---

Use `@azureServiceConfigurations` when the same API has different deployment endpoints, OAuth URLs, or scopes. Declare each endpoint and its authentication together instead of maintaining separate server and authentication mappings.

## Declare the configurations

This Logs-style example pairs Public and Government endpoints with their respective OAuth settings. The explicit default is Public even though Government is declared first.

```typespec
import "@typespec/http";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Azure.Core;

model PublicAuth is AadOauth2Auth<
  ["https://api.loganalytics.io/.default"],
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "https://login.microsoftonline.com/common/oauth2/v2.0/token"
>;

model GovernmentAuth is AadOauth2Auth<
  ["https://api.loganalytics.us/.default"],
  "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
  "https://login.microsoftonline.us/common/oauth2/v2.0/token"
>;

model Configurations {
  Government: {
    endpoint: "https://api.loganalytics.us";
    authentication: GovernmentAuth;
  };
  Public: {
    endpoint: "https://api.loganalytics.io";
    authentication: PublicAuth;
  };
}

@service
@azureServiceConfigurations(Configurations, "Public")
namespace Logs {
  @get
  @route("/query")
  op query(): string;
}
```

The decorator calls HTTP `@server` for every configuration, with the default first, and calls `@useAuth` once with their combined OR requirements. Do not add either HTTP decorator directly to the same namespace. Each configuration must preserve the same authentication mechanisms and requirement groups; only OAuth URLs and scopes vary. Existing API-key alternatives and AND groups can remain in each configuration.

For services with caller-supplied instance endpoints, use `endpoint: "{endpoint}"` and `parameters: { endpoint: url }` in each configuration. Parameters, defaults, and an optional `description` follow the same conventions as `@server`.

## SDK metadata

Azure Core preserves the associations that the flat HTTP server/authentication view cannot express. TCGC exposes them on `client.clientInitialization.serviceConfigurations`:

| Field                             | Meaning                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| `defaultConfiguration`            | The explicitly selected configuration name, such as `"Public"`. |
| `configurations[].name`           | A configuration's declared name, such as `"Government"`.        |
| `configurations[].endpoint`       | Its fixed endpoint or URL template and template parameters.     |
| `configurations[].authentication` | Its exact OAuth URLs, scopes, and OR-of-AND requirements.       |
| `configurations[].credential`     | Its projected credential parameter.                             |

Existing client endpoint, credential, and authentication fields describe the default configuration. Declarations that do not use this decorator retain their existing behavior and have no configuration catalog.

Language emitters must consume this catalog to generate their native configuration-selection APIs; that adoption is separate from this shared metadata feature. OAuth URLs do not reconfigure a caller-owned credential's authority or tenant. Scope inference from endpoints, challenge processing, and native audience APIs are outside this feature.
