---
title: Adding a Stable Version when the Last Version was Preview
llmstxt: true
---

When the last api-version in your TypeSpec spec is a preview, adding a new stable version means you must remove any preview types or other API changes from the preview and only leave those type changes that are now stable.

This includes the following steps:

## Making Changes to your TypeSpec spec

- Add a new entry to the versions enum for the new stable version
- Update any mention in documentation of the old api-version to use the new api-version

  ```bash
  > mv examples/2025-10-01-preview examples/2026-01-01
  ```

- Determine which type changes from the latest preview are now stable
  - Update the versioning decorators for those changes to reference the new stable version

    ```diff lang=tsp
    - @added(Versions.`2025-10-01-preview`)
    + @added(Versions.`2026-01-01`)
      remainingProperty?: string;
    ```

  - For changes in the latest preview (p) that are _not_ in the new stable version
    - For any type with an `@added(p)` decorator, delete the type

      ```diff lang=tsp
      - @added(Versions.`2025-10-01-preview`)
      - model Foo {}
      ```

    - For any property or parameter with a `@typeChangedFrom(p, Type)` decorator, replace the property type with the `Type` argument, and then remove the decorator, for example

      ```diff lang=tsp
      - @typeChangedFrom(Versions.`2025-12-01-preview`, string)
      - property: int32;
      + property: string;
      ```

    - For any operation with an `@returnTypeChangedFrom(p, ReturnType)` decorator, replace the return type with the `ReturnType` argument and then remove the decorator, for example:

      ```diff lang=tsp
      - @returnTypeChangedFrom(Versions.`2025-12-01-preview`, void)
      - move is ArmResourceActionSync(Widget, MoveOptions, MoveResult);
      + move is ArmResourceActionSync(Widget, MoveOptions, void);
      ```

    - For any type with an `@renamedFrom(p, Name)` decorator, replace the name of the type with the `Name` argument in the decorator and remove the decorator, for example:

      ```diff lang=tsp
      - @renamedFrom(Versions.`2025-12-01-preview`, "oldProperty")
      - newProperty: int32;
      + oldProperty: int32;
      ```

    - For any property or parameter with a `@madeOptional(p)` decorator, remove the decorator, and make the property required, for example:

      ```diff lang=tsp
      - @madeOptional(Versions.`2025-12-01-preview`)
      - property?: int32;
      + property: int32;
      ```

    - For any property or parameter with a `@madeRequired(p)` decorator, remove the decorator, and make the property optional, for example:

      ```diff lang=tsp
      - @madeRequired(Versions.`2025-12-01-preview`)
      - property: int32;
      + property?: int32;
      ```

    - For any type with an `@removed(p)` decorator, remove the decorator

      ```diff lang=tsp
      - @removed(Versions.`2025-12-01-preview`)
        property?: string;
      ```

    - For any property that uses the `@removed`/`@added`/`@renamedFrom` pattern to change decoration or a default value in the preview (see [Adding Decoration to an Existing Type](./06-evolving-apis.md#adding-decoration-to-an-existing-type)), reverse the pattern by removing both the old and new properties and restoring the original property. For example, if a property added a default value in preview:

      ```diff lang=tsp
        model Employee {
      -   @removed(Versions.`2025-12-01-preview`)
      -   @renamedFrom(Versions.`2025-12-01-preview`, "level")
      -   oldLevel: int32;
      -
      -   @added(Versions.`2025-12-01-preview`)
      -   level: int32 = 1;
      +   level: int32;
        }
      ```

      Here, `level` had a default value of `1` added in the preview. To reverse this, remove both properties (the renamed "old" version and the "new" version with the default) and restore the original property without the default.

    - For any operation that uses the `@removed`/`@added`/`@renamedFrom` pattern to convert from synchronous to asynchronous in preview, reverse the pattern by removing both operations and restoring the original synchronous operation. For example (ARM):

      ```diff lang=tsp
        @armResourceOperations
        interface Employees {
      -   @removed(Versions.`2025-12-01-preview`)
      -   @renamedFrom(Versions.`2025-12-01-preview`, "createOrUpdate")
      -   @sharedRoute
      -   createOrUpdateV1 is ArmResourceCreateOrReplaceSync<Employee>;
      -
      -   @added(Versions.`2025-12-01-preview`)
      -   @sharedRoute
      -   createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
      +   createOrUpdate is ArmResourceCreateOrReplaceSync<Employee>;
        }
      ```

      Here the operation was converted from `ArmResourceCreateOrReplaceSync` to `ArmResourceCreateOrReplaceAsync` in preview. To reverse this, remove both the old renamed operation and the new async operation, and restore the original synchronous operation.

      Similarly for data-plane:

      ```diff lang=tsp
        interface Widgets {
      -   @removed(Versions.`2025-12-01-preview`)
      -   @renamedFrom(Versions.`2025-12-01-preview`, "createOrReplaceWidget")
      -   @sharedRoute
      -   createOrReplaceWidgetV1 is Operations.ResourceCreateOrReplace<Widget>;
      -
      -   @added(Versions.`2025-12-01-preview`)
      -   getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget, never>;
      -
      -   @added(Versions.`2025-12-01-preview`)
      -   @sharedRoute
      -   @pollingOperation(Widgets.getWidgetOperationStatus)
      -   createOrReplaceWidget is Operations.LongRunningResourceCreateOrReplace<Widget>;
      +   createOrReplaceWidget is Operations.ResourceCreateOrReplace<Widget>;
        }
      ```

- Model any additional changes in the new stable version and mark with the appropriate versioning decorator, referencing the new stable version
- Remove the preview version from the version enum

  ```diff lang=tsp
  enum Versions {
  - @Azure.Core.previewVersion
  - `2025-10-01-preview`,
  + `2026-01-01`,
  }

  ```

- Change the name of the `examples` version folder for the latest preview to match the new stable version

- Ensure that examples use the correct api-version (search and replace the api-version for all examples in the folder)

  ```diff lang=json
  {
    "title": "Create a Widget",
    "operationId": "Widgets_Create",
    "parameters": {
  -   "api-version": "2025-12-01-preview",
  +   "api-version": "2026-01-01",
    }
  }
  ```

- Add and modify examples to match the API changes in the new stable version

## Preparing a PR into the azure-rest-api-specs repo

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

- update README.md to include a new entry for the new stable version and make it the default tag.

:::tip
If you wish to remove the OpenAPI files for the old preview version, do so in a **separate follow-up PR** after this PR merges. See [Should I Retain the OpenAPI for an Old Preview API](./01-about-versioning.md#should-i-retain-the-openapi-for-an-old-preview-api-arm-only).
:::

- If you _don't_ need the older preview version (see [Should I Retain the OpenAPI for an Old Preview API](./01-about-versioning.md#should-i-retain-the-openapi-for-an-old-preview-api-arm-only) if you are not sure), in a separate PR after this PR is merged, remove the OpenAPI directory for that version and update the `README.md` file to remove all references to the old preview version files.

  ```bash
  C:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP > rm -r 2025-12-01-preview
  ```
