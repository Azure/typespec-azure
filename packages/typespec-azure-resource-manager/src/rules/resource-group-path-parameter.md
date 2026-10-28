ARM resource-group paths must use the `resourceGroupName` path parameter after
`resourceGroups`. A custom base parameter with a different name, a literal group
value, or a missing group parameter can produce a nonstandard resource scope.

This rule checks concrete GET, PUT, PATCH, and DELETE operations in ARM
namespaces. Matching is case-insensitive. Paths without `/resourceGroups/`,
including subscription-scoped paths, are outside this check. POST and HEAD
operations are not checked.

Use the standard ARM template base parameters. When customization is necessary,
retain `ResourceGroupParameter` rather than replacing it with a differently named
property.

The ARM `all` ruleset enables this rule. The Azure resource-manager ruleset
leaves it disabled.

## Impact

- **Area:** API, SDK

Nonstandard resource-group parameters can produce inconsistent ARM routes and
client parameter names.

The examples use a standard `Widget` ARM resource and its read operation.

## ❌ Incorrect

The custom base replaces the standard resource-group parameter with `groupName`.

```tsp
model CustomBase {
  ...CommonTypes.ApiVersionParameter;
  ...CommonTypes.SubscriptionIdParameter;
  @path @segment("resourceGroups") groupName: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = CustomBase>;
}
```

## ✅ Correct

Use the template's default base parameters, which include `resourceGroupName`.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## Suppression

For an intentional, reviewed path exception, place
`#suppress "@azure-tools/typespec-azure-resource-manager/resource-group-path-parameter" "Reason for the exception."`
before the offending operation.

## LintDiff Equivalent

This rule corresponds to
[PathContainsResourceGroup](https://github.com/Azure/azure-openapi-validator/blob/18a7944e7fc3155e8ef1498665465ed5f455f54a/docs/path-contains-resource-group.md).
It preserves the case-insensitive full-path predicate: a canonical
`/resourceGroups/{resourceGroupName}` occurrence satisfies the check even if
another `resourceGroups` occurrence differs. This is not a complete ARM path
validator.

The native rule reports per concrete operation. Swagger selector multiplicity
and real-spec diagnostic correspondence require separate migration evidence.
