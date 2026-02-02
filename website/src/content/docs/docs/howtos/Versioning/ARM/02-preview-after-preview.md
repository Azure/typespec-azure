---
title: Adding a Preview Version when the Last Version was Preview
llmstxt: true
---

When the last api-version in your TypeSpec spec is a preview, adding a new preview version is simply replacing the latest preview version with a new preview version.

## The Simplest Case: No Stable api-versions

If your spec is in preview and has not ever had a stable api-version, then there is no need to have versioning decoration in your typespec at all:

- Change the api-version to match the new api-version
  ```diff lang=tsp
  enum Versions {
    @previewVersion
  - `2025-12-01-preview`
  + `2026-01-01-preview`
  }
  ```
- Remove any versioning decorators
- Make any api changes for the new preview, there is no need to use versioning decoration for this.
- Update the example folder name to match the new api-version

  ```bash
  > mv examples/2025-12-01-preview examples/2026-01-01-preview
  ```

- Update the `api-version` in examples to match the new api-version (search and replace api-version in the examples folder)

  ```diff lang=json
  {
    "title": "Create a Widget",
    "operationId": "Widgets_Create",
    "parameters": {
  -   "api-version": "2025-12-01-preview",
  +   "api-version": "2026-01-01-preview",
    }
  }
  ```

- If you **do not need** to retain the OpenAPI for older previews (see [Should I delete an old preview](./01-about-versioning.md#should-i-retain-the-openapi-for-an-old-preview-api) if you are not sure).
  - Remove the associated OpenAPI file and examples

    ```bash
    > rm -r 2025-12-01-preview
    ```

  - Remove any references to the old version from README.md

- Update the README.md to include the new api-version

## The General Case: One or more Stable Versions Exist

If there are stable versions before the latest preview version, then you will need to adapt the latest preview version and its decoration for the new preview version.

This includes the following steps:

### Making Changes to your TypeSpec spec

- Rename the latest preview version to match the new preview version, in all instances in the spec
  - In vscode, highlight the version name and select `rename symbol` from the context menu to rename the version throughout your spec
  - In any editor, search and replace the latest preview version in the spec with the new preview version
- Update the version value of this version to match the new api-version string, for example:

  ```diff lang=tsp
  enum Versions {
    @previewVersion
  - `2025-12-01-preview`,
  + `2026-01-01-preview`,
  }
  ```

- The new preview version should already be the _last version_ of the versions enum, also ensure it is decorated with `@previewVersion`
- Update any mention in documentation of the old api-version to use the new api-version

- Make changes to the API description based on how the API has changed from the last preview version to the new preview version (if it has changed)
  - If any type that was introduced in the latest preview is _not_ in the new preview, simply delete the type

    ```diff lang=tsp
    - @added(Versions.`2026-01-01-preview`)
    - model Foo {}
    ```

  - If any type was removed in the latest preview but **appears** in the new preview, remove the decorator

    ```diff lang=tsp
    - @removed(Versions.`2026-01-01-preview`)
      model Bar {}
    ```

  - Similarly, if there is any change from the latest preview that does not apply to the new preview version, reverse the decorator.

    ```diff lang=tsp
    - @renamedFrom(Versions.`2026-01-01-preview`, "oldProp")
    - newProp: string;
    + oldProp: string;
    ```

    ```diff lang=tsp
    - @typeChangedFrom(Versions.`2026-01-01-preview`, string)
    - changedProp: int32;
    + changedProp: string;
    ```

    ```diff lang=tsp
    - @madeOptional(Versions.`2026-01-01-preview`)
    - requiredProp?: string;
    + requiredProp: string;
    ```

  - If any other types are removed in the new preview (unlikely, because these would be breaking changes from the previous stable and require a breaking change review) mark these with an `@removed` decorator referencing the new version

    ```diff lang=tsp
    + @removed(Versions.`2026-01-01-preview`)
      model Bar {}
    ```

  - If any types are added, renamed, or otherwise modified in the new version, mark them with the appropriate versioning decorator.

- Change the name of the `examples` version folder for the latest preview to match the new preview version

  ```bash
  > mv examples/2025-12-01-preview examples/2026-01-01-preview
  ```

- Ensure that examples use the correct api-version (search and replace the api-version for all examples in the folder)

  ```diff lang=json
  {
    "title": "Create a Widget",
    "operationId": "Widgets_Create",
    "parameters": {
  -   "api-version": "2025-12-01-preview",
  +   "api-version": "2026-01-01-preview",
    }
  }
  ```

- Add and modify examples to match the api changes

### Preparing a PR into the azure-rest-api-specs repo

- Navigate to the root directory of the repo in your local fork or clone

  ```bash
  C:\repos\azure-rest-api-specs\specifications\myRp > cd \repos\azure-rest-api-specs
  C:\repos\azure-rest-api-specs >
  ```

- Pull the latest version from the repo

  ```bash
  C:\repos\azure-rest-api-specs > git fetch upstream main
  C:\repos\azure-rest-api-specs > git pull upstream main
  ```

- Reinstall dependencies

  ```bash
  C:\repos\azure-rest-api-specs > npm ci
  ```

- Compile your spec

  ```bash
  C:\repos\azure-rest-api-specs > cd specification\myRpShortname\resource-manager\Microsoft.MyRP\MyService
  C:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP\MyService > npx tsp compile .
  ```

- If you _don't_ need the older preview version (see [Should I delete an old preview](./01-about-versioning.md#should-i-retain-the-openapi-for-an-old-preview-api) if you are not sure), remove the OpenAPI directory for that version and update the `README.md` file to use the new version instead.

  ```bash
  C:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP\  > rm -r 2025-12-01-preview
  ```

- If you _do_ need the older preview version, update README.md to include a new entry for the new preview version.
