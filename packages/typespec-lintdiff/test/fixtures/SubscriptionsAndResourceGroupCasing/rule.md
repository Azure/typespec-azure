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

## Description

ARM resource paths must use the canonical `subscriptions` and
`resourceGroups` segment casing.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as the ARM Spectral rule
  `SubscriptionsAndResourceGroupCasing` and applies the shared
  `pathSegmentCasing` function to `$.paths` and `$.x-ms-paths` with the
  canonical `resourceGroups` and `subscriptions` segment names.
- The shipped upstream test (`packages/rulesets/src/spectral/test/path-segements-case.test.ts`)
  covers three semantic branches: uppercase `Subscriptions` => invalid,
  lowercase `resourcegroups` => invalid, correct casing => valid.
- A local ARM lint can mirror that logic directly from
  `getHttpOperation(...).path`. The repaired repros show those bad paths are
  authorable inside `interface Operations extends Azure.ResourceManager.Operations`
  without suppressing ARM prerequisite diagnostics.
- Standard `@armResourceOperations` templates still emit canonical casing, but
  they are not the only credible local protection anymore.

Treat this rule as having **direct local lint coverage** for authorable custom
operation paths, while standard ARM templates remain canonically cased by
construction.

## Semantic coverage notes

The local suite now covers the authorable upstream matrix directly:

- uppercase `Subscriptions` path segment => validator violation +
  `tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing`
- lowercase `resourcegroups` path segment => validator violation +
  `tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing`
- canonical ARM custom-operation path => compliant

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `wrong-subscriptions-casing` | true | ARM custom operation path uses `Subscriptions` instead of `subscriptions` |
| `wrong-resourcegroups-casing` | true | ARM custom operation path uses `resourcegroups` instead of `resourceGroups` |
| `compliant` | false | ARM custom operation path uses the canonical `subscriptions` and `resourceGroups` casing |
