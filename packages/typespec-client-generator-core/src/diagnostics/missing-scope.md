This diagnostic is issued when a decorator that is likely language-specific is used without a language scope; currently this is reported for external `@alternateType` metadata without a scope.

## Impact

- **Area:** Language-specific alternate-type customization. Blocks external type metadata that lacks a target emitter scope, preventing it from being applied globally by accident.
- **Not affected:** The TypeSpec type definition and service payload schema are unchanged.

## ❌ Incorrect Usage

```typespec
@alternateType({
  // external alternate type is missing a language scope
  identity: "pystac.Collection",

  package: "pystac",
  minVersion: "1.13.0",
})
model ItemCollection {}
```

## Diagnostic Message

TCGC reports:

```text
@scope decorator should be applied with @alternateType since it is highly likely this is language-specific
```

## ✅ How to Fix

Provide the appropriate language scope argument, such as `"python"`, `"csharp"`, or another emitter scope:

```typespec
@alternateType(
  {
    identity: "pystac.Collection",
    package: "pystac",
    minVersion: "1.13.0",
  },
  "python"
)
model ItemCollection {}
```
