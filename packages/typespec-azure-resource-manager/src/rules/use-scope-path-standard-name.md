ARM scope paths must use the standard serialized path parameter names:

- `resourceGroupName` after `resourceGroups`.
- `subscriptionId` after `subscriptions`.

A custom base parameter with a different name, a literal scope value, or a
missing scope parameter can produce a nonstandard resource scope.

This rule checks concrete GET, PUT, PATCH, and DELETE operations in ARM
provider namespaces. Matching is case-insensitive. Each scope is checked only
when its segment is present; the rule does not require adding either scope.
POST and HEAD operations and generic template declarations are not checked.
An operation with both names wrong receives two warnings under this one rule ID.

Use the standard ARM template base parameters. When customization is necessary,
retain `ResourceGroupParameter` and `CommonTypes.SubscriptionIdParameter`
rather than replacing them with differently named properties. The serialized
`@path` name, not the TypeSpec property name, determines the path parameter name.

## Impact

- **Area:** API, SDK

Nonstandard scope parameters can produce inconsistent ARM routes and
client parameter names.

The examples use a standard `Widget` ARM resource and its read operation.

## ❌ Incorrect

The custom base replaces the standard parameters with `subId` and `groupName`.

```tsp
model CustomBase {
  ...CommonTypes.ApiVersionParameter;
  @path @segment("subscriptions") subId: string;
  @path @segment("resourceGroups") groupName: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = CustomBase>;
}
```

## ✅ Correct

Use the template's default base parameters, which include both standard names.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## Suppression

For an intentional, reviewed path exception, place
`#suppress "@azure-tools/typespec-azure-resource-manager/use-scope-path-standard-name" "Reason for the exception."`
before the offending operation. The suppression applies to both naming checks.

The rule is enabled in the ARM library's `all` ruleset and disabled in
`@azure-tools/typespec-azure-rulesets/resource-manager`. Enable the rule
explicitly when using that ruleset.

## LintDiff Equivalent

This rule combines
[PathContainsResourceGroup](https://github.com/Azure/azure-openapi-validator/blob/18a7944e7fc3155e8ef1498665465ed5f455f54a/docs/path-contains-resource-group.md)
and
[PathContainsSubscriptionId](https://github.com/Azure/azure-openapi-validator/blob/18a7944e7fc3155e8ef1498665465ed5f455f54a/docs/path-contains-subscription-id.md).
It preserves their case-insensitive full-path predicates: a canonical
`/resourceGroups/{resourceGroupName}` or `/subscriptions/{subscriptionId}`
occurrence satisfies that member even if another occurrence of the same
segment differs. This is not a complete ARM path validator.

The native rule reports per concrete operation. Swagger selector multiplicity
and real-spec diagnostic correspondence require separate migration evidence.
