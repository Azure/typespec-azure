---
title: Adding a Preview Version when the Last Version was a Preview
---

When the previous version of your TypeSpec spec is a preview, adding a new preview version is simply replacing the latest preview version with a new preview version.
This includes:

## Making Changes to your TypeSpec spec

- Rename the latest preview version to match the new preview version, in all instances in the spec
  - In vscode, highlight the version name and select `rename symbol` from the context menu to rename the version througholut your spec
  - In any editor, search and replace the latest preview version in the spec with the new preview version
- Update the version value of this version to match the new api-version string
- Update any version documentation to use the new version
- Change the name of the `examples` version folder for the latest preview to match the new preview version
- Make changes to the API description based on how the API has changed
  - If any type that was introduced in the latest preview is _not_ in the new preview, simply remove the type
  - If any other types are removed in this preview (unlikely) mark these with an `@removed` decorator referencing the new version
  - If any types are added, renamed, or otherwise modified in the new version, mark them with the appropriate versioning decorator
- Add and modify examples to match the api changes

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

- If you _do_ need the older preview version, update README.md to include a new entry for the new preview version.
