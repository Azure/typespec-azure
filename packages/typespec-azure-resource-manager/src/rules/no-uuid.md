Avoid UUID-typed schemas in Azure Resource Manager APIs unless their use has explicit Azure API review approval.

## Impact

- **Area:** API, SDK

UUIDs are difficult for customers to create, recognize, and troubleshoot. Prefer stable, human-readable identifiers that follow the resource's naming constraints. UUID wire types also become language-specific UUID types in generated SDKs, which can make an API harder to use consistently across languages.

The rule checks UUID model properties, HTTP parameters, request and response bodies, response headers, custom scalar aliases, and container types. It also checks UUID formats applied directly with `@format("uuid")`.

## Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetProperties {
  id: Azure.Core.uuid;
}
```

## Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model WidgetProperties {
  id: string;
}
```

If a UUID is required, obtain Azure API review approval and suppress the rule at the authored declaration with the approval context.

## LintDiff Equivalent

This rule corresponds to the Swagger validator rule [GuidUsage](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/guid-usage.md).
