---
title: arm-resource-provisioning-state
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state
```

`ProvisioningState` property of ARM resource must be:

- optional
- readonly
- must at least contain `Succeeded`, `Canceled`, and `Canceled`

#### ❌ Incorrect

```tsp
model ResourceProperties {
  provisioningState: ResourceProvisioningState;
}
```

#### ✅ Correct

```tsp
model ResourceProperties {
  @visibility("read")
  provisioningState?: ResourceProvisioningState;
}
```
