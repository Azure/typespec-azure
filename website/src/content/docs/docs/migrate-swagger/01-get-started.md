---
title: Getting started
order: 0
---

# Getting started with TypeSpec migration

We have created a swagger to TypeSpec conversion tool to help take on the bulk of the manual conversion labor. It can handle both data-plane and management-plane swaggers. The produced TypeSpec relies on the Azure.Core and Azure.Resource.Manager libraries.

**_Important!_** Because TypeSpec is more expressive than Swagger and with the help of evolving Azure libraries, this tool should only be used as an aid in the conversion/migration process, not as the sole tool to produce final version of TypeSpec specs without human inspection, correction and optimization.

## Steps of migration and comparison

### Prerequisite

- Clone [azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs).
- Install dependencies:
  ```shell
  npm install # Run at root
  ```

### Generate TypeSpec with converter

- Go to your `specification/{service-name}` folder in `azure-rest-api-specs`.
- Create a directory holding TypeSpec files. See example for [control-plane](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/contosowidgetmanager/Contoso.Management) and [data-plane](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/contosowidgetmanager/Contoso.WidgetManager).
- Run the tool from the directory.

  - Convert a **data-plane** specification:

    ```shell
    tsp-client convert --swagger-readme [path to readme.md]
    ```

  - Convert a **control-plane** specification:

    ```shell
    tsp-client convert --swagger-readme [path to readme.md] --arm
    ```

  - Convert a **control-plane** specification to fully compatible output:

    By default, the converted TypeSpec project will leverage TypeSpec built-in libraries with standard patterns and templates (highly recommended), which will cause discrepancies between the generated TypeSpec and original swagger. If you really don't want this intended discrepancy, add `--fully-compatible` flag to generate a TypeSpec project that is fully compatible with the swagger.

    ```shell
    tsp-client convert --swagger-readme [path to readme.md] --arm --fully-compatible
    ```

### Review and adjust the TypeSpec

You will need to compare the Swagger generated from TypeSpec with your original Swagger specification(s) to ensure functional equivalence. 

- In your TypeSpec folder, compile your TypeSpec files to emit an auto-generated Swagger:
  ```shell
  tsp compile .
  ```

- From the root folder, download the last specification as baseline. Your original specification will be located at `.\sparse-spec\specification\{service-name}`:
  ```shell
  .\node_modules\@typespec-migration\swagger-compare\src\download-main.ps1 {path\to\your\generated\swagger}
  ```

- At the end of the console output, you'll see the next command to sort, merge, and normalize your original Swagger(s) and generated Swagger, making it easier to review changes. Provide an `outputFolder` to store the analysis results:
  ```shell
  node .\node_modules\@typespec-migration\swagger-compare\dist\index.js {your\original\swagger\folder} {your\generated\swagger\file} {outputFolder}
  ```

- In the `{outputFolder}`:
  - `newSwagger.json` is the processed version of your generated Swagger
  - `oldSwagger.json` is the processed version of your original Swagger(s)
  
  In VS Code, select both files, right-click and choose "Compare Selected" to see differences.

- Review and make appropriate changes to ensure minimal changes for swagger. You can go thourgh the steps in this section iteratively until you are satisfied with the updated differences.

### Create Spec PR with new TypeSpec project

- Review CI checks such as breaking changes and other failures.

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
