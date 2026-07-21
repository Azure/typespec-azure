This diagnostic is issued when `@clientOption` is used without a specific language scope.

To fix this issue, pass the intended language scope as the third argument to `@clientOption`.

### Example

Instead of:

```typespec
using Azure.ClientGenerator.Core;

#suppress "@azure-tools/typespec-client-generator-core/client-option" "temporary workaround"
@clientOption("enableFeatureFoo", true)
model Widget {}
```

Specify the emitter scope:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/client-option" "temporary Python workaround"
@clientOption("enableFeatureFoo", true, "python")
model Widget {}
```
