# invalid-client-api-version-override

The API version passed to `@Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion` must contain
at least one non-whitespace character, and the decorated interface must resolve to a subclient.

## Example

```typespec
@Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion("")
interface Widgets {}
```

The decorator also cannot be applied to an interface that is a root client.

Use the exact non-empty wire value expected by the existing SDK instead.
