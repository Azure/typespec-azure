```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state
```

`ProvisioningState` property of ARM resource must be:

- optional
- readonly
- must at least contain `Succeeded`, `Canceled`, and `Failed`

## Impact

- **Area:** API

A missing or invalid provisioning state violates the RPC and RPaaS contracts.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ProvisioningStateValidation](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md) (also ProvisioningStateSpecifiedForLROPut, ProvisioningStateSpecifiedForLROPatch, and RpaaS_ResourceProvisioningState).

#### ❌ Incorrect

```tsp
model ResourceProperties {
  provisioningState: ResourceProvisioningState;
}
```

#### ✅ Correct

```tsp
model ResourceProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise define a provisioning state property with `Succeeded`, `Failed`, and `Canceled` states.
