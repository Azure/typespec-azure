---
validatorRuleId: SubscriptionsAndResourceGroupCasing
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing
coverageKind: lint
tspTemplateLints: []
---

# SubscriptionsAndResourceGroupCasing

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

**Native lint severity:** warning

## Description

ARM resource paths must use the canonical `subscriptions` and
`resourceGroups` segment casing.

This rule checks complete path segments on ARM operations, including operations
inside a provider's child namespace. Each incorrectly cased segment produces a
warning on its operation. Parameter names and collection names that only start
with these words are not checked.

Use `subscriptions` rather than `Subscriptions`, and `resourceGroups` rather
than `resourcegroups`. Standard ARM templates use canonical casing by default,
but a custom `BaseParameters` model can change the path segments.

The following examples use `ArmResourceRead`. They assume an ARM service with
a `Widget` proxy resource and the standard `Operations` interface.

### Incorrect

```typespec
model CustomBase {
  ...CommonTypes.ApiVersionParameter;
  ...CommonTypes.SubscriptionIdParameter;
  @path @segment("resourcegroups") resourceGroupName: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = CustomBase>;
}
```

### Correct

```typespec
model CustomBase {
  ...CommonTypes.ApiVersionParameter;
  ...CommonTypes.SubscriptionIdParameter;
  @path @segment("resourceGroups") resourceGroupName: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = CustomBase>;
}
```

The native test's standard-template pair compiles these exact models and
operations with the stated service/resource setup. The incorrect case reports
one diagnostic on `read`; the corrected case reports none.
Incorrect casing can prevent resource-provider registration.

## LintDiff Equivalent

### Native rule contract

- Check complete HTTP path segments named `subscriptions` or `resourceGroups`,
  ignoring case only to identify those two names. Require their canonical casing.
- Check ARM provider operations, including nested namespaces. The provider guard
  isolates this ARM rule in lintdiff's mixed ruleset; promotion to the ARM library
  can rely on its ruleset audience instead.
- Use supported `getHttpOperation` metadata. Like the official
  `arm-no-path-casing-conflicts` rule, target the authored operation; unlike that
  rule, detect an incorrectly cased path even without a conflicting second path.
- Report one warning per incorrectly cased segment occurrence, on the operation.
  Do not check parameter identifiers, arbitrary collection-name prefixes, or
  query-string text.
- The existing substring search can misidentify collection names such as
  `SubscriptionsHistory`. Its exact-namespace guard also misses operations inside
  a provider's child namespace. Native regressions cover both rule-owned decisions.
- Standard ARM scope parameters fix these segments by construction. Supported
  `BaseParameters` template customization and custom operations can still change
  them; template enforcement therefore does not close this gap.
- No emitter, OpenAPI metadata, reference-string inference, or SDK API is needed.
  Historical version attribution remains comparison evidence, not rule filtering.

- Upstream `azure-openapi-validator` registers this as the ARM Spectral rule
  `SubscriptionsAndResourceGroupCasing` and applies the shared
  `pathSegmentCasing` function to `$.paths` and `$.x-ms-paths` with the
  canonical `resourceGroups` and `subscriptions` segment names.
- The shipped upstream test (`packages/rulesets/src/spectral/test/path-segements-case.test.ts`)
  covers three semantic branches: uppercase `Subscriptions` => invalid,
  lowercase `resourcegroups` => invalid, correct casing => valid.
- A local ARM lint checks complete segments from
  `getHttpOperation(...).path`. The repros show those bad paths are
  authorable inside `interface Operations extends Azure.ResourceManager.Operations`
  without suppressing ARM prerequisite diagnostics.
- Standard `@armResourceOperations` defaults use canonical casing. However,
  `ArmResourceRead<Widget, BaseParameters = CustomBase>` accepts custom segments,
  as the native template pair proves.

Treat this rule as having **direct local lint coverage** for authorable custom
operation paths and template customizations. Standard ARM template defaults use
canonical casing.

## Semantic coverage notes

The local suite now covers the authorable upstream matrix directly:

- uppercase `Subscriptions` path segment => validator violation +
  `tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing`
- lowercase `resourcegroups` path segment => validator violation +
  `tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing`
- canonical ARM custom-operation path => compliant

Native unit tests also prove nested provider scope, independent warnings for both
names and repeated segment occurrences, and acceptance of unrelated name prefixes.
The validator searches only the first matching substring for each canonical name.
This rule deliberately checks complete segments and all occurrences instead.
See `migration.md` for the comparison population and these parity differences.

## Test Cases

| ID                            | Violation | Description                                                                                                                                 |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `wrong-subscriptions-casing`  | true      | ARM custom operation path uses `Subscriptions` instead of `subscriptions`                                                                   |
| `wrong-resourcegroups-casing` | true      | ARM custom operation path uses `resourcegroups` instead of `resourceGroups`                                                                 |
| `compliant`                   | false     | ARM custom operation path uses the canonical `subscriptions` and `resourceGroups` casing                                                    |
| `nested-provider`             | true      | Custom operation inside a child namespace uses `Subscriptions`                                                                              |
| `collection-name-prefix`      | false     | Complete collection segment `SubscriptionsHistory` is not the reserved `subscriptions` segment; reviewed validator substring false positive |
