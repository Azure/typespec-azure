---
title: "beyond-nesting-levels"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/beyond-nesting-levels
```

Tracked Resources must use 3 or fewer levels of nesting. Deeply nested resources make the API harder to use and are discouraged by ARM guidelines.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

// 4 levels of nesting: A > B > C > D — too deep
model A is TrackedResource<{}> {
  @key("a")
  @segment("as")
  @path
  name: string;
}

@parentResource(A)
model B is TrackedResource<{}> {
  @key("b")
  @segment("bs")
  @path
  name: string;
}

@parentResource(B)
model C is TrackedResource<{}> {
  @key("c")
  @segment("cs")
  @path
  name: string;
}

@parentResource(C)
model D is TrackedResource<{}> {
  @key("d")
  @segment("ds")
  @path
  name: string;
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

// 3 levels of nesting: A > B > C
model A is TrackedResource<{}> {
  @key("a")
  @segment("as")
  @path
  name: string;
}

@parentResource(A)
model B is TrackedResource<{}> {
  @key("b")
  @segment("bs")
  @path
  name: string;
}

@parentResource(B)
model C is TrackedResource<{}> {
  @key("c")
  @segment("cs")
  @path
  name: string;
}
```
