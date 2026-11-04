ARM list responses must use a predictable envelope containing exactly an array-valued `value` and
`nextLink`. Additional top-level properties or a missing envelope property make generated clients
and pagination tooling handle list operations inconsistently.

## Impact

- **Area:** API

Collection response envelopes with other shapes violate the ARM RPC contract and can produce
inconsistent generated client pagination behavior.

The rule uses `resolveArmResources` to identify each resource's `operations.lists`
and checks their HTTP 200 response models. Resources without list operations are
skipped. List membership comes from ARM resource metadata, not URL path patterns,
`@list`, or paging decorators. Unassociated operations are not checked, even if
they have collection-shaped paths or paging metadata.

Inherited envelope properties are included. The `value` property must be an array,
and the next-link property must be named `nextLink`, not a custom envelope name.
Prefer standard ARM list operation templates, which provide this envelope.

## ❌ Incorrect

```tsp
@service
@armProviderNamespace
namespace Contoso.Widgets;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

model WidgetListResult {
  @pageItems value: Widget[];

  @nextLink
  nextLink?: string;

  totalCount?: int32;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
  listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetListResult>>;
}
```

## ✅ Correct

```tsp
@service
@armProviderNamespace
namespace Contoso.Widgets;

model Widget is ProxyResource<{}> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
  listByParent is ArmResourceListByParent<Widget>;
}
```

## LintDiff Equivalent

### Consolidated list-response coverage

The checks formerly proposed as `list-response-value-array` are part of the existing `list-response-envelope` rule; its public name is retained.

| Migrated lintdiff rule                                                                                                                                                                     | Coverage in this existing TypeSpec rule                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [GetCollectionOnlyHasValueAndNextLink](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/get-collection-only-has-value-and-next-link.ts) | Checks that eligible collection response models have exactly the `value` and `nextLink` envelope properties, including inherited properties. |
| [CollectionObjectPropertiesNaming](https://github.com/Azure/azure-openapi-validator/blob/main/docs/collection-object-properties-naming.md)                                                 | Requires the `value` property to be an array and combines that requirement with the standard envelope names.                                 |

Swagger identifies collection GET APIs through path heuristics. The native TypeSpec
rule instead checks list operations associated with resolved ARM resources, without
reimplementing those path heuristics or requiring paging metadata. Checks use HTTP
200 response bodies. `list-operation-missing-pageable` remains a separate metadata
check.

The combined native contract intentionally rejects a custom next-link property name even when it has valid paging metadata. These mappings describe TypeSpec response models and metadata, not emitted Swagger inspection or unchanged historical diagnostic counts.

## Suppression

Suppress this rule only when compatibility requirements prevent the response envelope from
containing exactly `value` and `nextLink`.
