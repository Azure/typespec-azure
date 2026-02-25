changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

This change adds multiple-services client support and consolidates client hierarchy customization around `@client`. Cross-service clients now expose `apiVersionsMap` on `SdkClientType`, and multi-service hierarchy scenarios are supported, including mixed multi-service and single-service clients and nested `@client` definitions.

This change is breaking because when multiple `@service` namespaces exist without explicit `@client`, TCGC now creates a separate root client for each service instead of only using the first service and emitting the `multiple-services` warning.

`@operationGroup` is now deprecated in favor of nested `@client`, and `SdkOperationGroup` is deprecated in favor of `SdkClient`-based hierarchy customization while retaining backward compatibility for existing usage.

Migration guide: if you relied on implicit first-service-only behavior, either remove extra `@service` declarations or add explicit `@client` decorators to control which services are included and how hierarchy is shaped.
