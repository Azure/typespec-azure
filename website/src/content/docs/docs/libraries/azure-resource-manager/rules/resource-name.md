---
title: "resource-name"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/resource-name
```

Check the resource name. ARM resource model names must contain only alphanumeric characters (starting with an uppercase letter), and the `name` property must be a read-only `@path` parameter.

#### ❌ Incorrect

```tsp
model My_Resource is TrackedResource<MyResourceProperties> {
  @key("myResourceName")
  @segment("myResources")
  @path
  name: string;
}
```

#### ✅ Correct

```tsp
model MyResource is TrackedResource<MyResourceProperties> {
  @key("myResourceName")
  @segment("myResources")
  @visibility(Lifecycle.read)
  @path
  name: string;
}
```
