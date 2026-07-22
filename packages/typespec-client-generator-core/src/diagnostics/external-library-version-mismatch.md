This diagnostic is issued when external `@alternateType` metadata refers to the same external package with more than one minimum version.

## Impact

- **Area:** Language-specific external type dependencies. Generation continues, but the targeted emitter may receive conflicting minimum versions for the same external package.
- **Not affected:** The TypeSpec source types and service payload schema are unchanged.

#### ❌ Incorrect Usage

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

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
External library version mismatch. There are multiple versions of pystac: 1.12.0 and 1.13.0. Please unify the versions.
```

#### ✅ How to Fix

Use one package version for all external alternate type declarations that reference the same package.

## Suppression

Suppress this warning only if dependency version unification is handled outside TCGC and the emitter will use one compatible external package version.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/external-library-version-mismatch" "external package version unified by emitter"
```
