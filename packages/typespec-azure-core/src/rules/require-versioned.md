Azure services should always use the versioning library even if they have a single version. This ensures that the service is ready for future versions and generate the OpenAPI 2.0 in the correct location.

## Impact

- **Area:** API, SDK

Without versioning, the API cannot be updated with new api-versions.

#### ❌ Incorrect

```tsp
@service
namespace Azure.MyService;
```

```tsp
@service(#{ version: "2021-01-01" })
namespace Azure.MyService;
```

```tsp
@service
@OpenAPI.info({
  version: "2021-01-01",
})
namespace Azure.MyService;
```

#### ✅ Correct

```tsp
@versioned(Versions)
@service
namespace Azure.MyService;

enum Versions {
  2021_01_01: "2021-01-01",
}
```

## Suppression

Do not suppress. Add a Versions enum and reference it from the `@versioned` decorator on the root namespace.
