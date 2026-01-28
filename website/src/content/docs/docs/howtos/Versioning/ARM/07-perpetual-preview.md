---
title: How to Manage a Single Active Preview When Some Features Always Remain In Preview
llmstxt: true
---

For some Resource Providers, whenever a new stable version is released, a new preview version is created, because some preview features are not ready to be stable, but may become stable in a future version. To accommodate this need and account for the limitations of breaking change checks, which require a single version change for any PR into the rest-api-specs repo, the recommended solution is to introduce a stable and subsequent preview _together_ in your TypeSpec api description and then split this change into two PRs: one representing the new stable and the second representing the subsequent preview. This involves the following steps described in the sections below:

- Create the new preview version based on the latest preview version
- Create the stable version (which should immediately precede the new preview version)
- Fill in examples for each
- Create a copy of the spec with just the stable release changes for your first PR
- After this PR is merged, create a PR with the whole spec, effectively adding the new preview

## Creating New Preview and Stable Versions

- If the existing preview version is `A`, add the new stable version `A + 1` and the new preview version `A + 2` to the Versions enumeration, ensure that version `A + 2` is decorated with `@previewVersion` from the `Azure.Core` library (and remove that decoration from any other version).
- For all changes from preview version `A` that are part of stable version `A + 1`, do the following:
  - if a new type was added in `A` and is now stable (`@added(T, A)`), add the new decorator `@added(T, A + 1)`

    ```diff lang=tsp
      @added(Versions.`2025-10-01-preview`)
    + @added(Versions.`2025-11-01`)
      remainType: string;
    ```

  - if a type was made optional in `A` and this change is now stable (`@madeOptional(T, A)`), add the new decorator `@madeOptional(T, A + 1)`

    ```diff lang=tsp
      @madeOptional(Versions.`2025-10-01-preview`)
    + @madeOptional(Versions.`2025-11-01`)
      optionalType?: string;
    ```

  - if a type was renamed in `A` and this change is now stable (`@renamedFrom(T, A, Name)`), add the new decorator `@renamedFrom(T, A + 1, Name)`

    ```diff lang=tsp
      @renamedFrom(Versions.`2025-10-01-preview`, "oldName")
    + @renamedFrom(Versions.`2025-11-01`, "oldName")
      newName: string;
    ```

  - if a property or parameter had its type changed in `A` and is now stable (`@typeChangedFrom(T, A, U)`), add the new decorator `@typeChangedFrom(T, A + 1, U)`

    ```diff lang=tsp
      @typeChangedFrom(Versions.`2025-10-01-preview`, int32)
    + @typeChangedFrom(Versions.`2025-11-01`, int32)
      changedType: string;
    ```

  - if an operation returnType was changed in `A` and this change is now stable (`@returnTypeChangedFrom(T, A, U)`), add the new decorator `@returnTypeChangedFrom(T, A + 1, U)`

    ```diff lang=tsp
      @returnTypeChangedFrom(Versions.`2025-10-01-preview`, void)
    + @returnTypeChangedFrom(Versions.`2025-11-01`, void)
      move is ArmResourceActionSync<Widget, MoveRequest, MoveResponse>
    ```

  - If a type was removed in `A` and this change is now stable (`@removed(T, A)`), add the new decorator `@removed(T, A + 1)`

    ```diff lang=tsp
      @removed(Versions.`2025-10-01-preview`)
    + @removed(Versions.`2025-11-01`)
      goneType: string;
    ```

- Change all versioning decorators `dec(T, A, args)` to `dec(T, A + 2, args)` where `T` is a type, `A` is the latest preview version, `A + 2` is the new preview version you added in the first step and `args` are any additional arguments to the decorator. Note that, after this change, some decorators will be duplicated in version `A + 1` and version `A + 2`. This is expected.

  ```diff lang=tsp
  - @removed(Versions.`2025-10-01-preview`)
    @removed(Versions.`2025-11-01`)
  + @removed(Versions.`2025-12-01-preview`)
    goneType: string;
  ```

- Add any new type changes to stable version (A + 1) and decorate appropriately, as shown in the [versioning guide](../versioning.md). Note that these changes should also appear in the new preview (A + 2)
- Remove version `A` from the versions enumeration

  ```diff lang=tsp
  enum Versions {
  - @previewVersion
  - `2025-10-01-preview`,
  + `2025-11-01`,
  + @previewVersion
  + `2025-12-01-preview`,
  }
  ```

- Create examples directories for the new stable version (A + 1) and populate them with appropriate examples
- If version A _is not needed_ in the specs repo (see [Should I delete an old preview](./01-about-versioning.md#should-i-retain-the-openapi-for-an-old-preview-api) if you are not sure)
  - Remove its example folder

    ```bash
    > rm -r examples/2025-10-01-preview
    ```

  - Remove the OpenAPI spec for version A
  - Remove all references to version A in `README.md`

## Create A Copy of the Spec for the Stable Version only

- Create a complete copy of your spec
  - This copy will be used to contain just the new stable version (use this to create the first PR into the specs repo). Call this Copy.
  - The original version will contain both the new stable _and_ preview versions (use this to create the final PR after the first PR is merged). Call this Original.
- Do the following with the Copy
  - Remove all decorators that reference version `A + 2` and use the same parameters as in `A + 1`
    - For example, if these decorators exist: `@added(T, A + 2) @added(T, A + 1)`, then, after this step, only `@added(T, A + 1)` should remain in this copy of the spec.

    ```diff lang=tsp
      @added(Versions.`2025-11-01`)
    - @added(Versions.`2025-12-01-preview`)
      addedType: string;
    ```

  - Undo and remove any remaining decorators referencing `A + 2` using the following guide:
    - For any type `T` decorated with `@added(T, A + 2)`, delete the type `T` and all its decorators

      ```diff lang=tsp
      - @added(Versions.`2025-12-01-preview`)
      - goneType: string;
      ```

    - For any type `T` decorated with `@removed(T, A + 2)`, remove the decorator

      ```diff lang=tsp
      - @removed(Versions.`2025-12-01-preview`)
        remainType: string;
      ```

    - For any type `T` decorated with `@renamedFrom(T, A + 2, oldName)` rename the type `oldName` and remove the decorator

      ```diff lang=tsp
      - @renamedFrom(Versions.`2025-12-01-preview`, "oldName")
      - newName: string;
      + oldName: string;
      ```

    - For any property or parameter `T` decorated with `@typeChangedFrom(T, A + 2, oldType)` set the type of the property to `oldType` and remove the decorator

      ```diff lang=tsp
      - @typeChangedFrom(Versions.`2025-12-01-preview`, int32)
      - changedType: string;
      + changedType: int32;
      ```

    - For any operation `T` decorated with `@returnTypeChangedFrom(T, A + 2, oldType)` set the return type of the operation to `oldType` and remove the decorator

      ```diff lang=tsp
      - @returnTypeChangedFrom(Versions.`2025-12-01-preview`, void)
      - move is ArmResourceActionSync<Widget, MoveRequest, MoveResponse>;
      + move is ArmResourceActionSync<Widget, MoveRequest, void>;
      ```

    - For any property or parameter `T` decorated with `@madeOptional(T, A + 2)` make the parameter or property `T` required and remove the decorator

      ```diff lang=tsp
      - @madeOptional(Versions.`2025-12-01-preview`)
      - remainType?: string;
      + remainType: string;
      ```

  - Remove version `A + 2` from the version enum.

    ```diff lang=tsp
    enum Versions {
      `2025-11-01`,
    - @previewVersion
    - `2025-12-01-preview`,
    }
    ```

  - Compile the spec to produce artifacts (especially the new stable version (`A + 1`) openapi )
  - Add the new stable version (`A + 1`) to the README.md file.
  - Create and merge the PR

## Create a PR with the Combined Spec

- Do the following with the Original
  - Follow the instructions for normalizing decoration in the [converting specifications](./06-converting-specs.md#normalizing-version-decoration-optional) document. This will remove any redundant decoration between the new stable and preview versions (`A + 1` and `A + 2`).
  - Add any type changes that are introduced in the new preview and decorate appropriately, following the [versioning guide](../../ARM/versioning.md)
  - Add a new example folder for the new preview version and populate with appropriate examples.
  - Compile the spec to produce artifacts (especially the new stable and preview version (`A + 1` and `A + 2` ) apis).
  - Copy the README.md from copy 1 and add the new preview version to the file.
  - Create and merge the final PR - this copy will be your specification going forward.
