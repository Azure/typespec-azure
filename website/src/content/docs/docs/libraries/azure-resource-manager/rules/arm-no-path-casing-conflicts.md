---
title: arm-no-path-casing-conflicts
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-no-path-casing-conflicts
```

ARM operation paths must be unique case-insensitively. Two operations whose
paths differ only by character casing (for example `/foos` and `/Foos`, or
`/{scope}/...` and `/{Scope}/...`) violate this rule. Path parameter names
are part of the comparison: paths whose parameter names differ (for example
`/{resourceUri}/...` versus `/{scope}/...`) are treated as distinct.

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
