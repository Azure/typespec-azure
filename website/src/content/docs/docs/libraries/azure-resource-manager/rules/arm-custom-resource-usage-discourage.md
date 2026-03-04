---
title: arm-custom-resource-usage-discourage
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-custom-resource-usage-discourage
```

Avoid using the `@customAzureResource` decorator. It doesn't provide validation for ARM resources, and its usage should be limited to brownfield services migration.

#### ❌ Incorrect

```tsp
@Azure.ResourceManager.Legacy.customAzureResource
model Person {
  name: string;
}
```

#### ✅ Correct

Use standard ARM resource types:

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}
```
