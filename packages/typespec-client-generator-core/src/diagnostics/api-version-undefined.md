This diagnostic is issued when the `api-version` emitter option names a version that is not present in the service versioning list.

To fix this issue, set `api-version` to a service version that exists, or use `latest` or `all` when those behaviors are intended.

### Example

```typespec
using TypeSpec.Versioning;

@service(#{ title: "Contoso Widget Manager" })
@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions {
  v1,
  v2,
  v3,
}
```

If the emitter is configured with `api-version: "v4"`, TCGC reports this diagnostic because `v4` is not defined in `Versions`; use `v1`, `v2`, `v3`, `latest`, or `all`.
