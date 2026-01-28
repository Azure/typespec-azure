---
title: Adding a Stable Version when the Last Version was a Stable Version
llmstxt: true
---

When the latest api-version in your TypeSpec spec is a stable version, adding a new stable version is simply adding any new types and operations in the new stable and marking them with the appropriate versioning decoration, as described in [TypeSpec Versioning for Azure ResourceManager APIs](../../ARM/versioning.md).

## Making Changes to your TypeSpec spec

- Add a new version to the `Versions` enum in your spec for the new stable api-version.
- Make changes to the API description based on how the API has changed
  - If any types are removed in this stable (unlikely) mark these with an `@removed` decorator referencing the new version
  - If any types are added, renamed, or otherwise modified in the new version, mark them with the appropriate versioning decorator
- Create a new examples folder for the new version `examples\<version>` and populate it with examples.

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

  - Update README.md to include a new entry for the new stable version.
