---
title: "require-versioned"
---

```text title="Full name"
@azure-tools/typespec-azure-core/require-versioned
```

Azure services should always use the versioning library even if they have a single version. This ensures that the service is ready for future versions and generate the OpenAPI 2.0 in the correct location.

#### ❌ Incorrect

```tsp
@service
namespace Azure.MyService;
```

```tsp
@service({
  version: "2021-01-01",
})
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
