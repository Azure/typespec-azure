---
title: Immediately Replacing a Preview Version
---

For some Resource Providers, whenever a new stable version is released, a new preview version is created, because some preview features are not ready to be stable, but may become stable in a future version. To accommodate this need and account for the limitations of breaking change checks, which require a single version change for any PR into the rest-api-specs repo, the recommended solution is to introduce a stable and subsequent preview _together_ in your TypeSpec api description and then split this change into two PRs: one representing the new stable and the second representing the subsequent preview. This involves the following steps described in the sections below:

- Create the new preview version based on the latest preview version
- Create the stable version (which should immediately precede the new preview version)
- Fill in examples for each
- Create a copy of the spec with just the stable release changes for your first PR
- After this PR is merged, create a PR with the whole spec, effectively adding the new preview

## Creating New Preview and Stable Versions

- If the existing preview version is `A`, add the new stable version `A + 1` and the new preview version `A + 2` to the Versions enumeration.
- For all changes from preview version `A` that are part of stable version `A + 1`
  - if a new type was added in `A` and is now stable (`@added(T, A)`), add the new decorator `@added(T, A + 1)`
  - if a type was made optional in `A` and this change is now stable (`@madeOptional(T, A)`), add the new decorator `@madeOptional(T, A + 1)`
  - if a type was renamed in `A` and this change is now stable (`@renamedFrom(T, A, Name)`), add the new decorator `@typeChangedFrom(T, A + 1, Name)`
  - if a property or parameter had its type changed in `A` and is now stable (`@typeChangedFrom(T, A, U)`), add the new decorator `@typeChangedFrom(T, A + 1, U)`
  - if an operation returnType was changed in `A` and this change is now stable (`@returnTypeChangedFrom(T, A, U)`), add the new decorator `@returnTypeChangedFrom(T, A + 1, U)`
  - If a type was removed in `A` and this change is now stable (`@removed(T, A)`), add the new decorator `@removed(T, A + 1)`
- Change all versioning decorators `dec(T, A, args)` to `dec(T, A + 2, args)` where `T` is a type, `A` is the latest preview version, `A + 2` is the new preview version you added in the first step and `args` are any additional arguments to the decorator. Note that, after this change, some decorators will be duplicated in version `A + 1` and version `A + 2`. This is expected.
- Remove version `A` from the versions enumeration
- Create examples directories for the two new versions and populate them with appropriate examples
- If version A _is not needed_ in the specs repo
  - Remove its example folder
  - Remove all references to version A in `README.md`

  ## Create A Copy of the Spec for the Stable Version only

- Create two copies of your spec
  - One which will contain just the new stable version (use this to create the first PR into the specs repo). Call this Copy 1.
  - The other will contain both the new stable _and_ preview versions (use this to create the final PR after the first PR is merged). Call this Copy 2.
- Do the following with Copy 1
  - Remove version `A + 2` and all decorators that reference version `A + 2` from the spec.
  - Compile the spec to produce artifacts (especially the new stable version (`A + 1`) openapi )
  - Add the new stable version (`A + 1`) to the README.md file.
  - Create and merge the PR

## Create a PR with the Combined Spec

- Do the following with Copy 2
  - Follow the instructions for normalizing decoration in the [converting specifications](./06-converting-specs.md#normalizing-version-decoration-optional) document. This will remove any redundant decoration between the new stable and preview versions (`A + 1` and `A + 2`).
  - Compile the spec to produce artifacts (especially the new stable and preview version (`A + 1` and `A + 2` ) apis).
  - Copy the README.md from copy 1 and add the new preview version to the file.
  - Create and merge the final PR - this copy will be your specification going forward.
