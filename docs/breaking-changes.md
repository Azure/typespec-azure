# Breaking changes

Breaking changes in TypeSpec libraries affect downstream consumers: the spec repo (`azure-rest-api-specs`) and the SDK repositories. Because these repos update on different schedules, breaking changes need to be rolled out carefully.

## Release timeline

TypeSpec releases on a fixed cadence (first Tuesday at the end of a sprint). After a release the downstream update order is:

1. **Release day** – TypeSpec packages are published to npm.
2. **Day after release** – The spec repo (`azure-rest-api-specs`) is updated to the new version. This gap gives SDK emitters time to release compatible versions and SDK repos time to start updating.
3. **Following days** – SDK repos update at their own pace.

## Smooth rollout strategy

Whenever possible, breaking changes should follow a **two-release rollout** to avoid a flag-day migration:

1. **Release N** – Introduce the new capability alongside the old one (both work).
2. **Between releases** – Migrate all specs and consumers to the new capability. This should _not_ happen during the spec-repo upgrade PR itself.
3. **Release N+1** – Remove the old capability (the actual breaking change). By this point no spec or SDK should still be using it.

## Timing within a sprint

Breaking changes should be merged **early in a sprint**. This gives:

- Nightly CI pipelines time to surface issues.
- SDK emitter teams time to prepare a compatible PR before the release.

## Hard breaking changes

Some changes cannot follow the two-release rollout (e.g. a fundamentally new API shape). For those:

- Before merging the breaking change to `typespec` or `typespec-azure`, a companion PR that handles the change **must be ready** for every affected client emitter.
- Coordinate with emitter owners so all PRs can land in the same release window.
