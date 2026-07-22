This diagnostic is issued when `@clientApiVersions` is applied to a service namespace that is not versioned.

To fix this issue, add TypeSpec versioning to the service namespace or remove `@clientApiVersions`.

### Example

```typespec
@service
@clientApiVersions(ApiVersions)
namespace My.Service {
  enum ApiVersions {
    v1,
    v2,
  }
}
```

`My.Service` is not versioned; add `@versioned(Versions)` or remove `@clientApiVersions`.
