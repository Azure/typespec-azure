---
title: "arm-resource-patch"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-patch
```

Validate ARM PATCH operations. The request body of a PATCH must be a model with a subset of the resource properties. If the resource has a `tags` property, the PATCH body must include it. The PATCH body must not contain properties that do not exist on the resource.

#### ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("employees")
  @path
  name: string;
}

model EmployeePatch {
  // Missing "tags" property — resource has tags since it's a TrackedResource
  properties?: EmployeeProperties;
}
```

#### ✅ Correct

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("employees")
  @path
  name: string;
}

model EmployeePatch {
  tags?: Record<string>;
  properties?: EmployeeProperties;
}
```

#### ❌ Incorrect

```tsp
model EmployeePatch {
  tags?: Record<string>;
  properties?: EmployeeProperties;
  // "extra" does not exist on the Employee resource
  extra?: string;
}
```

#### ✅ Correct

```tsp
model EmployeePatch {
  tags?: Record<string>;
  properties?: EmployeeProperties;
}
```
