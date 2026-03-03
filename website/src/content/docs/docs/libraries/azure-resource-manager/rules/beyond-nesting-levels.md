---
title: "beyond-nesting-levels"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/beyond-nesting-levels
```

Tracked Resources must use 3 or fewer levels of nesting. Deeply nested resources make the API harder to use and are discouraged by ARM guidelines.

#### ❌ Incorrect

```tsp
// 4 levels of nesting — too deep
@parentResource(Level2)
model Level3 is TrackedResource<Level3Properties> {
  @key("level3Name")
  @segment("level3s")
  @path
  name: string;
}

@parentResource(Level3)
model Level4 is TrackedResource<Level4Properties> {
  @key("level4Name")
  @segment("level4s")
  @path
  name: string;
}
```

#### ✅ Correct

```tsp
// 3 or fewer levels of nesting
model TopLevel is TrackedResource<TopLevelProperties> {
  @key("topLevelName")
  @segment("topLevels")
  @path
  name: string;
}

@parentResource(TopLevel)
model Child is TrackedResource<ChildProperties> {
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@parentResource(Child)
model GrandChild is TrackedResource<GrandChildProperties> {
  @key("grandChildName")
  @segment("grandChildren")
  @path
  name: string;
}
```
