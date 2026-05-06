---
title: arm-no-path-casing-conflicts
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-no-path-casing-conflicts
```

ARM operation paths must be unique case-insensitively. Two operations whose
paths differ only by character casing of static path segments (for example
`/foos` and `/Foos`) violate this rule.

When the casing difference is in a `@segment("...")` decorator value, an
auto-fix is offered that lowercases the offending segment.

#### ❌ Incorrect

```tsp
model Foo is ProxyResource<{}> {
  @key("name")
  @path
  @segment("foos")
  @visibility(Lifecycle.Read)
  name: string;
}

model Bar is ProxyResource<{}> {
  @key("name")
  @path
  @segment("Foos") // conflicts case-insensitively with `foos` above
  @visibility(Lifecycle.Read)
  name: string;
}
```

#### ✅ Correct

```tsp
model Foo is ProxyResource<{}> {
  @key("name")
  @path
  @segment("foos")
  @visibility(Lifecycle.Read)
  name: string;
}

model Bar is ProxyResource<{}> {
  @key("name")
  @path
  @segment("bars")
  @visibility(Lifecycle.Read)
  name: string;
}
```
