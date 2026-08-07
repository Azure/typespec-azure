The value passed to `@Azure.Core.Legacy.overrideApiVersion` must contain at least one
non-whitespace character.

## Incorrect usage

```typespec
@Azure.Core.Legacy.overrideApiVersion("")
namespace Service {

}
```

## How to fix

Provide the opaque API-version wire value expected by the generated client.

```typespec
@Azure.Core.Legacy.overrideApiVersion("2021-11-01")
namespace Service {

}
```
