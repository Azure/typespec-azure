Azure services version their APIs with the `api-version` query parameter, never with a version segment in the URL path. Embedding a version in the path forces every client to change its URLs when a new version ships, and it prevents a single endpoint from serving multiple API versions.

See [`versioning-no-version-in-path`](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#versioning-no-version-in-path) in the Azure REST API Guidelines: **DO NOT** include a version number segment in any operation path.

This rule flags any literal path segment that looks like a version number, for example `v1`, `V2`, or `v1.0`. Segments produced by a path parameter (`{version}`) are not flagged.

## Impact

- **Area:** API

Path-based versioning is a breaking change for every client each time the version is bumped, and it is incompatible with the Azure versioning story used by the generated SDKs.

#### ❌ Incorrect

A version segment at the start of the route:

```tsp
@route("/v1/widgets")
@get
op listWidgets(@query("api-version") apiVersion: string): Widget[];
```

A version segment anywhere else in the route:

```tsp
@route("/api/v2/widgets")
@get
op listWidgets(@query("api-version") apiVersion: string): Widget[];
```

A version segment contributed by an interface route:

```tsp
@route("/v1")
interface Widgets {
  @route("/widgets")
  @get
  list(): Widget[];
}
```

#### ✅ Correct

Version the API with the `api-version` query parameter only:

```tsp
@route("/widgets")
@get
op listWidgets(@query("api-version") apiVersion: string): Widget[];
```

Or, preferably, let `Azure.Core` supply the `api-version` parameter:

```tsp
@versioned(Versions)
@service
namespace Contoso.Widgets;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@route("/widgets")
interface Widgets {
  list is Azure.Core.StandardResourceOperations.ResourceList<Widget>;
}
```

## Suppression

Suppress only when the path segment is not an API version (for example, an existing service where `v2` is a genuine resource name). Otherwise remove the segment and version the API with `api-version`.
