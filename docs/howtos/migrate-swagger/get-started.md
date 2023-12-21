# Migrate Azure API spec from swagger to TypeSpec

We have created a swagger to TypeSpec conversion tool to help take on the bulk of the manual conversion labor. It can handle both data-plane and management-plane swaggers. The produced TypeSpec relies on the Azure.Core and Azure.Resource.Manager libraries.

**_Important!_** Because TypeSpec is more expressive than Swagger and with the help of evolving Azure libraries, this tool should only be used as an aid in the conversion/migration process, not as the sole tool to produce final version of TypeSpec specs without human inspection, correction and optimization.

## Steps of running the tool

- Ensure `powershell` is installed.
- Ensure `autorest` tool is installed. [Installation guide](https://github.com/Azure/autorest/blob/main/docs/install/readme.md)
- Download conversion script [here](https://aka.ms/azsdk/openapi-to-typespec-script).
- Running the conversion tool.

```powershell
./convert.ps1 [path to readme.md]

# OR specify parameter by name
./convert.ps1 -swaggerConfigFile [path to readme.md]
```

- Review generated TypeSpec
- Layout [the TypeSpec project folders appropriately](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/typespec-structure-guidelines.md).
- Leverage standard `tspconfig.yaml` ([Template projects](https://github.com/microsoft/typespec/tree/main/eng/feeds)) and make appropriate output file name changes.
- Ensure it compiles successfully locally and then submit a PR
- Review CI checks such as breaking changes and other failures.
