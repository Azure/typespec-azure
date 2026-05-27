---
title: Getting started
order: 0
---

# Getting started with TypeSpec migration

We have created a OpenAPI to TypeSpec conversion tool to help take on the bulk of the manual conversion labor. It can handle both data-plane and management-plane OpenAPI files. The produced TypeSpec relies on the Azure.Core and Azure.Resource.Manager libraries.

**_Important!_** Because TypeSpec is more expressive than OpenAPI and with the help of evolving Azure libraries, this tool should only be used as an aid in the conversion/migration process, not as the sole tool to produce final version of TypeSpec specs without human inspection, correction and optimization.

## Steps of migration and comparison

### Prerequisite

- Clone the appropriate repository based on your service type:
  - **RPSaaS service**: Clone the repository where the latest version of your service spec resides — either [azure-rest-api-specs-pr](https://github.com/Azure/azure-rest-api-specs-pr) or [azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs).
  - **non-RPSaaS service**: Clone [azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs).
- Install dependencies:
  ```shell
  npm install # Run at root of the repository
  ```

### Generate TypeSpec with converter

- Ensure your service folder structure follows the [Specification Folder Structure Guide](https://github.com/Azure/azure-rest-api-specs/wiki/Specification-Folder-Structure-Guide).
- Go to the service folder 
  - **control-plane**: `specification/{organization}/resource-manager/{resource-provider-namespace}/{service-name}`.
  - **data-plan**: `specification/{organization}/data-plane/{service-name}`.
- Run the tool from the directory.
  - Convert a **data-plane** specification:

    ```shell
    tsp-client convert --swagger-readme [path to readme.md]
    ```

  - Convert a **control-plane** specification:

    ```shell
    tsp-client convert --swagger-readme [path to readme.md] --arm --fully-compatible
    ```

### Review and adjust the TypeSpec

You will need to compare the OpenAPI file generated from TypeSpec with the original OpenAPI specification(s) to ensure functional equivalence.

- In the TypeSpec folder, compile TypeSpec files to emit an auto-generated OpenAPI file:

  ```shell
  tsp compile .
  ```

- From the root folder, download the latest specification as baseline. Your original specification will be located at `.\sparse-spec\specification\{service-name}`:

  - For **non-RPSaaS service** (cloned from `azure-rest-api-specs`):

    ```shell
    .\eng\tools\typespec-migration-validation\scripts\download-main.ps1 {path\to\your\generated\openapi\file}
    ```

  - For **RPSaaS service** (cloned from `azure-rest-api-specs-pr`):

    ```shell
    .\eng\tools\typespec-migration-validation\scripts\download-main.ps1 {path\to\your\generated\openapi\file} -isRPSaaSMaster $true
    ```

- At the end of the console output, you'll see the next command to sort, merge, and normalize the original OpenAPI file(s) and generated OpenAPI file, making it easier to review changes. Provide an `outputFolder` to store the analysis results:

  ```shell
  npx tsmv {your\original\openapi\folder} {your\generated\openapi\file} --outputFolder {outputFolder}
  ```

- In the `{outputFolder}`:
  - `newNormalizedSwagger.json` is the processed version of the generated OpenAPI file
  - `oldNormalizedSwagger.json` is the processed version of the original OpenAPI file(s)

  In VS Code, select both files (select `oldNormalizedSwagger.json` first, then `newNormalizedSwagger.json`), right-click and choose "Compare Selected". Review these differences to understand their patterns.

- Check out the output from `npx tsmv` execution. It prints errors, warnings, suggested fixes, and prompts. Carefully review each item and take the appropriate action:

  - **Errors:** These indicate issues that must be resolved before the migration can proceed. Address them before continuing.
  - **Warnings:** These highlight potential problems that may affect correctness. Review each one and decide whether action is needed.

- For remaining differences, follow this iterative process:
  1. Recompile TypeSpec files with `tsp compile .` in the TypeSpec folder.
  2. Run the `npx tsmv` command again with the same parameters.
  3. Review the updated differences in VS Code.
  4. Make further adjustments as needed. Refer to [Understanding the OpenAPI Changes](./faq/mustread.md) to understand expected changes and mitigation steps.

  :::tip[Recommended order for fixing differences]
  For more effective visualization, fix differences in this order:
  1. **Path (route) differences** first
  2. **Definition (model) name differences** next
  3. **Detail differences** within paths and definitions last
  :::

Once the TypeSpec-generated OpenAPI achieves functional equivalence with the original OpenAPI at the API level, add SDK emitter configurations to your `tspconfig.yaml` to validate that SDKs can be generated correctly from the TypeSpec.

Refer to the example at [`specification/widget/resource-manager/Microsoft.Widget/Widget/tspconfig.yaml`](https://github.com/Azure/azure-rest-api-specs/blob/main/specification/widget/resource-manager/Microsoft.Widget/Widget/tspconfig.yaml) in `azure-rest-api-specs` for the language-specific emitter options to add.

### Create Spec PR with new TypeSpec project

- In the `readme.md` file, under the latest tag, change the `input-file` to the OpenAPI file generated from TypeSpec.
- If the generated OpenAPI file(s) for the latest version changed name, delete the old OpenAPI file(s) no longer referenced in README.md.
- Create a PR with the TypeSpec files, changed OpenAPI files (examples included) and readme file.
- Check CI failures. Refer to [Resolving Pipeline failures](./faq/pipeline.md)

### Canary Validation (RPSaaS service only)

If your service is an RPSaaS service, you must perform canary validation to verify the TypeSpec-generated spec works correctly before creating a PR. Follow the steps described in the [Testing TypeSpec conversion in Canary](https://armwiki.azurewebsites.net/rpaas/typespeccanarytesting.html) documentation.

## How to Get Help

- Ask questions in the [TypeSpec Discussions Channel](https://teams.microsoft.com/l/channel/19%3a906c1efbbec54dc8949ac736633e6bdf%40thread.skype/TypeSpec%2520Discussion%2520%25F0%259F%2590%25AE?groupId=3e17dcb0-4257-4a30-b843-77f47f1d4121&tenantId=72f988bf-86f1-41af-91ab-2d7cd011db47)
- Attend TypeSpec office hours. The office hours is listed on top tabs on the discussion channel.
- File issues in the [typespec-azure github repo](https://github.com/azure/typespec-azure/issues)
  - For bugs, please include:
    - A high-level description of the bug
    - Expected and Actual Results
    - Repro steps, including any TypeSpec code that you used
    - Any error messages you saw, including stack traces. For issues with VS or VS Code tooling see [Troubleshooting VSCode Tooling and Filing Issues](../typespec-getting-started.md#troubleshooting-vscode-tooling-and-filing-issues)
- Schedule review meetings with TypeSpec team.
