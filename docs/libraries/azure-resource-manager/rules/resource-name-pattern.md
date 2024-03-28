---
title: resource-name-pattern
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/resource-name-pattern
```

Resource names must specify a pattern string using `@pattern`, providing a regular expression that the name must match.

#### ❌ Incorrect

```tsp
model Employee is ProxyResource<{}> {
  @key("employeeName")
  @path
  @segment("employees")
  name: string;
}
```

#### ✅ Correct

```tsp
model Employee is ProxyResource<{}> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @key("employeeName")
  @path
  @segment("employees")
  name: string;
}
```
