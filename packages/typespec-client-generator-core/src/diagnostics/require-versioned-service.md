This diagnostic is issued when `@clientApiVersions` is applied to a service namespace that is not versioned.

## Impact

- **Area:** API-version decorator validation. Generation continues, but `@clientApiVersions` has no service version list to extend on an unversioned namespace.
- **Not affected:** The unversioned service operations are otherwise generated normally.

## ❌ Incorrect Usage

```typespec
@service
@clientApiVersions(ApiVersions) // namespace is not decorated with `@versioned`
namespace My.Service {
  enum ApiVersions {
    v1,
    v2,
  }
}
```

## Diagnostic Message

For the declaration above, TCGC reports:

```text
Service "My.Service" must be versioned if you want to apply the "@clientApiVersions" decorator
```

## ✅ How to Fix

Add TypeSpec versioning to the service namespace or remove `@clientApiVersions`.

```typespec
@service
@versioned(Versions)
@clientApiVersions(ApiVersions)
namespace My.Service {
  enum Versions {
    v1,
    v2,
  }

  enum ApiVersions {
    v1,
    v2,
  }
}
```

## Suppression

Suppress this warning only if `@clientApiVersions` is temporarily present before service versioning is added and the generated client should ignore it.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/require-versioned-service" "client API versions staged before versioning"
```
