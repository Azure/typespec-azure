---
title: arm-custom-resource-usage-discourage
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-custom-resource-usage-discourage
```

Avoid using the `@customAzureResource` decorator. It doesn't provide validation for ARM resources, and its usage should be limited to brownfield services migration.

#### ❌ Incorrect

```tsp
@customAzureResource
model MyResource {
  @key("myResourceName")
  @segment("myResources")
  @visibility(Lifecycle.Read)
  name: string;
}
```

#### ✅ Correct

```tsp
model MyResource is TrackedResource<MyResourceProperties> {
  @key("myResourceName")
  @segment("myResources")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}
```
