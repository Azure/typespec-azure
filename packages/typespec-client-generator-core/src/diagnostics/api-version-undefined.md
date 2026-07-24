This diagnostic is issued when the `api-version` emitter option names a version that is not present in the service versioning list.

## Impact

- **Area:** API-version option resolution. Generation continues by falling back to the latest defined service version, which can target a different SDK API version than requested.
- **Not affected:** The service's declared version enum and versioned TypeSpec projections are unchanged.

## ❌ Incorrect Usage

```typespec
@service(#{ title: "Contoso Widget Manager" })
@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions {
  v1,
  v2,
  v3,
}
```

```yaml
options:
  "@azure-tools/typespec-python":
    api-version: "v4" # v4 is not one of v1/v2/v3
```

## Diagnostic Message

TCGC reports:

```text
The API version specified in the config: "v4" is not defined in service versioning list. Fall back to the latest version.
```

## ✅ How to Fix

Set `api-version` to a service version that exists. `latest` and `all` are also valid values when those behaviors are intended.

```yaml
options:
  "@azure-tools/typespec-python":
    api-version: "v3"
```

## Suppression

This diagnostic should not be suppressed. Fix the configured `api-version` value in `tspconfig.yaml` so it matches the service versioning list, or use `latest` or `all` intentionally.
