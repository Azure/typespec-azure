# Migrate Azure API spec from swagger to TypeSpec

We have created a swagger to TypeSpec conversion tool to help take on the bulk of the manual conversion labor. It can handle both data-plane and management-plane swaggers. The produced TypeSpec relies on the Azure.Core and Azure.Resource.Manager libraries.

**_Important!_** Because TypeSpec is more expressive than Swagger and with the help of evolving Azure libraries, this tool should only be used as an aid in the conversion/migration process, not as the sole tool to produce final version of TypeSpec specs without human inspection, correction and optimization.

## Steps of running the tool

- Ensure [Node.js 18.3 LTS](https://nodejs.org/en/download/) or later is installed.
- Install [`@azure-tools/typespec-client-generator-cli`](https://www.npmjs.com/package/@azure-tools/typespec-client-generator-cli):

```bash
npm install -g @azure-tools/typespec-client-generator-cli
```

- Run the conversion tool:

```bash
tsp-client convert --swagger-readme [path to readme.md]
```

Run the tool from the directory you would like to output your files, alternately specify an output directory:

```bash
tsp-client convert --swagger-readme [path to readme.md] --output-dir [path to output directory]
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
