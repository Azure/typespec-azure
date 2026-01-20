---
title: Adding a Stable Version when the Last Version was a Preview
---

When the previous version of your TypeSpec spec is a preview, adding a new stable version means

This includes:

## Making Changes to your TypeSpec spec

- Add a new entry tpo the versions enum for the new stable version
- Update any version documentation to use the new version
- Change the name of the `examples` version folder for the latest preview to match the new stable version
- Determine which type changes from the latest preview are now stable
  - Update the versioning decorators for those changes to reference the new stable version
  - For changes in the latest preview that are _not_ in the new stable version
    - For any type with an `@added` decorator, remove the type
    - For any property or parameter with a `@typeChangedFrom` decorator, replace the property type with the type in the second decorator argument, and then remove the decorator, for example

      ```tsp
      @typeChangedFrom(Versions.2025-12-01-preview, string)
      property: int32;
      ```

      should be changed to:

      ```tsp
      property: string;
      ```

    - For any operation with an `@returnTypeChangedFrom` decorator, replace the return type with the type in the second decorator argument and then remove the decorator, for example:

      ```tsp
      @returnTypeChangedFrom(Versions.2025-12-01-preview, void)
      move is ArmResourceActionSync(Widget, MoveOptions, MoveResult);
      ```

      should be changed to:

      ```tsp
      move is ArmResourceActionSync(Widget, MoveOptions, void);
      ```

    - For any type with an `@renamedFrom` decorator, replace the name of the type with the second argument in the decorator and remove the decorator, for example:

      ```tsp
      @renamedFrom(Versions.2025-12-01-preview, "oldProperty")
      newProperty: int32;
      ```

      should be changed to:

      ```tsp
      oldProperty: int32;
      ```

    - For any property or parameter with a `@madeOptional` decorator, remove the decorator, and make the property required, for example:

      ```tsp
      @madeOptional(Versions.2025-12-01-preview)
      property?: int32;
      ```

      should be changed to:

      ```tsp
      property: int32;
      ```

    - For any type with an `@removed` decorator, remove the decorator

- Model any additional changes in the new stable version and mark with the appropriate versioning decorator, referencing the new stable version
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

- Rename any examples folder for the preview api-version to match the new api-version

  ```bash
  C:\repos\azure-rest-api-specs > cd specification\myRpShortname\resource-manager\Microsoft.MyRP\examples
  C:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP\examples > mv 2025-12-01-preview 2026-01-15-preview
  ```

- Compile your spec

  ```bash
  C:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP\examples > cd ..
  C:\repos\azure-rest-api-specsC:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP > npx tsp compile .
  ```

- If you _don't_ need the older preview version, remove the OpenAPI directory for that version and update the `README.md` file to use the new version instead.

  ```bash
  C:\repos\azure-rest-api-specsC:\repos\azure-rest-api-specs\specification\myRpShortname\resource-manager\Microsoft.MyRP > rm -r 2025-12-01-preview
  ```

- If you _do_ need the older preview version, update README.md to include a new entry for the new stable version.
