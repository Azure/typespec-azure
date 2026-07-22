This diagnostic is issued when external `@alternateType` metadata refers to the same external package with more than one minimum version.

To fix this issue, use one package version for all external alternate type declarations that reference the same package.

### Example

```typespec
@alternateType(
  {
    identity: "pystac.Item",
    package: "pystac",
    minVersion: "1.12.0",
  },
  "python"
)
model Item {}

@alternateType(
  {
    identity: "pystac.Collection",
    package: "pystac",
    minVersion: "1.13.0",
  },
  "python"
)
model Collection {}
```

Both alternate types use `pystac`; choose one `minVersion` for that package.
