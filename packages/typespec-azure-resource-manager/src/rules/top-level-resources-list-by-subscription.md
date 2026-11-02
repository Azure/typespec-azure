Top-level resources with subscription-scoped instance operations must provide a
subscription-wide GET collection for the same resource. Add
`ArmListBySubscription<Widget>` alongside the resource's lifecycle operations.

The rule uses `resolveArmResources` and resolved HTTP routes. It checks
`/subscriptions/{subscriptionId}/providers/{namespace}/{collection}/{name}`
and requires a successful GET on the corresponding collection path.
Resource-group, tenant, location, and nested-resource instance paths are outside
this rule's scope. Unused resource declarations do not produce diagnostics.

## Impact

- **Area:** API

Without a subscription-wide list, clients cannot discover the resource instances
in a subscription.

This rule is opt-in and disabled in both the ARM library's `all` ruleset and
`@azure-tools/typespec-azure-rulesets/resource-manager`.

## Incorrect

```typespec
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## Correct

```typespec
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
  list is ArmListBySubscription<Widget>;
}
```

The examples assume a `Widget` resource decorated with `@subscriptionResource`
in an ARM service.

## LintDiff Equivalent

This rule corresponds to
[TopLevelResourcesListBySubscription](https://github.com/Azure/azure-openapi-validator/blob/main/docs/top-level-resources-list-by-subscription.md)
(RPC-Get-V1-05). Like the Swagger rule's `isPathBySubscription` predicate, it does
not require this list for resource-group instance paths.

This is an initial implementation for review. Full-corpus equivalence and
coverage comparisons are intentionally deferred.
