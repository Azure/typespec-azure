Azure services use date-based API versions. The values of the version enum referenced by `@versioned` must be a `YYYY-MM-DD` date, optionally followed by a `-preview` suffix.

See [`versioning-date-based-versioning`](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#versioning-date-based-versioning) in the Azure REST API Guidelines: **DO** use `YYYY-MM-DD` date values, with a `-preview` suffix for preview versions, as the valid values for `api-version`.

This rule checks both the shape of the value and that the date is a real calendar date, so `2021-13-45` and `2023-02-29` are rejected as well as `v1` and `2021-6-4`.

## Impact

- **Area:** API, SDK

Date-based versions sort naturally, make the age of an API version obvious, and are what Azure tooling and the generated SDKs expect. Names such as `-beta` or `-rc` are not recognized as preview versions.

#### ❌ Incorrect

Semver-style versions:

```tsp
@versioned(Versions)
@service
namespace Contoso.Widgets;

enum Versions {
  v1,
  v2,
}
```

A date that is not zero-padded:

```tsp
@versioned(Versions)
@service
namespace Contoso.Widgets;

enum Versions {
  v2021_6_4: "2021-6-4",
}
```

A suffix other than `-preview`:

```tsp
@versioned(Versions)
@service
namespace Contoso.Widgets;

enum Versions {
  v2021_06_04_beta: "2021-06-04-beta",
}
```

A value that is date-shaped but is not a real date:

```tsp
@versioned(Versions)
@service
namespace Contoso.Widgets;

enum Versions {
  v2021_13_45: "2021-13-45",
}
```

#### ✅ Correct

```tsp
@versioned(Versions)
@service
namespace Contoso.Widgets;

enum Versions {
  v2021_06_04_preview: "2021-06-04-preview",
  v2021_10_01: "2021-10-01",
}
```

## Suppression

Suppress only for an existing GA'd service whose published API versions cannot be changed without breaking customers.
