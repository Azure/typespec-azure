# Migrate Azure API spec from swagger to TypeSpec

We have created a swagger to TypeSpec conversion tool to help take on the bulk of the manual conversion labor. It can handle both data-plane and management-plane swaggers. The produced TypeSpec relies on the Azure.Core and Azure.Resource.Manager libraries.

**_Important!_** Because TypeSpec is more expressive than Swagger and with the help of evolving Azure libraries, this tool should only be used as an aid in the conversion/migration process, not as the sole tool to produce final version of TypeSpec specs without human inspection, correction and optimization.

## Steps of running the tool

- Ensure `powershell` is installed.
- Ensure `autorest` tool is installed. [Installation guide](https://github.com/Azure/autorest/blob/main/docs/install/readme.md)
- Download conversion script [here](https://aka.ms/azsdk/openapi-to-typespec-script).
- Running the conversion tool.

```powershell
./convert.ps1 [path to readme.md] [path to output folder]

# OR specify parameter by name
./convert.ps1 -swaggerConfigFile [path to readme.md] -outputFolder [path to output folder]
```

- Review generated TypeSpec
- Layout [the TypeSpec project folders appropriately](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/typespec-structure-guidelines.md).
- Leverage standard `tspconfig.yaml` ([Template projects](https://github.com/microsoft/typespec/tree/main/eng/feeds)) and make appropriate output file name changes.
- Ensure it compiles successfully locally and then submit a PR
- Review CI checks such as breaking changes and other failures.

## How to Get Help

- Ask questions in the [TypeSpec Discussions Channel](https://teams.microsoft.com/l/channel/19%3a906c1efbbec54dc8949ac736633e6bdf%40thread.skype/TypeSpec%2520Discussion%2520%25F0%259F%2590%25AE?groupId=3e17dcb0-4257-4a30-b843-77f47f1d4121&tenantId=72f988bf-86f1-41af-91ab-2d7cd011db47)
- Attend TypeSpec office hours. The office hours is listed on top tabs on the discussion channel.
- File issues in the [typespec-azure github repo](https://github.com/azure/typespec-azure/issues)
  - For bugs, please include:
    - A high-level description of the bug
    - Expected and Actual Results
    - Repro steps, including any TypeSpec code that you used
    - Any error messages you saw, including stack traces. For issues with VS or VS Code tooling see [Troubleshooting VSCode Tooling and Filing Issues](#troubleshooting-vscode-tooling-and-filing-issues)
- Schedule review meetings with TypeSpec team.
