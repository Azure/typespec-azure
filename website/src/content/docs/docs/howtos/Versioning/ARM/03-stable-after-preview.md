---
title: Adding a Stable Version when the Last Version was a Preview
llmstxt: true
---

When the last api-version in your TypeSpec spec is a preview, adding a new stable version means you must remove any preview types or other api-changes from the preview and only leave those type changes that are now stable.

This includes the followign steps:

## Making Changes to your TypeSpec spec

- Add a new entry to the versions enum for the new stable version
- Update any mention in documentation of the old api-version to use the new api-version
- Change the name of the `examples` version folder for the latest preview to match the new stable version

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

    - For any type with an `@removed(p)` decorator, remove the decorator

    ```diff lang=tsp
    - @removed( Versions.`2025-12-01-preview`)
      property?: string;
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

- Add and modify examples to match the api changes in the new stable version

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
  C:\repos\azure-rest-api-specs > npm install
  ```

- Compile your spec

  ```bash
  C:\repos\azure-rest-api-specs > cd specification\myRpShortname\resource-manager\Microsoft.MyRP
  C:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP > npx tsp compile .
  ```

- If you _don't_ need the older preview version, remove the OpenAPI directory for that version and update the `README.md` file to use the new version instead.

  ```bash
  C:\repos\azure-rest-api-specsC:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP > rm -r 2025-12-01-preview
  ```

- If you _do_ need the older preview version, update README.md to include a new entry for the new stable version.
