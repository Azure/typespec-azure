This diagnostic is issued when a decorator that is likely language-specific is used without a language scope; currently this is reported for external `@alternateType` metadata without a scope.

To fix this issue, provide the appropriate language scope argument, such as `"python"`, `"csharp"`, or another emitter scope.

### Example

Instead of applying external type information to every emitter:

```typespec
using Azure.ClientGenerator.Core;

@alternateType({
  identity: "pystac.Collection",
  package: "pystac",
  minVersion: "1.13.0",
})
model ItemCollection {}
```

Provide the language scope:

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
