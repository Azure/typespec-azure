This diagnostic is issued when the `api-version` emitter option names a version that is not present in the service versioning list.

## Impact

- **Area:** API-version option resolution. Generation continues by falling back to the latest defined service version, which can target a different SDK API version than requested.
- **Not affected:** The service's declared version enum and versioned TypeSpec projections are unchanged.

#### ❌ Incorrect Usage

```typespec
@service(#{ title: "Contoso Widget Manager" })
@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions { // configured api-version `v4` is not defined here
  v1,
  v2,
  v3,
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
The API version specified in the config: "v4" is not defined in service versioning list. Fall back to the latest version.
```

#### ✅ How to Fix

Set `api-version` to a service version that exists, or use `latest` or `all` when those behaviors are intended.

## Suppression

Suppress this warning only if falling back to the latest service version is the intended behavior for the configured emitter run.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/api-version-undefined" "latest version fallback is intentional"
```
