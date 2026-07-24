ARM operation paths must be unique case-insensitively. Two operations whose
paths differ only by character casing (for example `/foos` and `/Foos`, or
`/{scope}/...` and `/{Scope}/...`) violate this rule. Path parameter names
are part of the comparison: paths whose parameter names differ (for example
`/{resourceUri}/...` versus `/{scope}/...`) are treated as distinct.

## Impact

- **Area:** API, SDK

Different-cased paths to the same resource can cause ARM manifest failures.

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

## Suppression

Do not suppress unless it is a false positive. Normalize the path casing.
