---
title: TypeSpec Introduction
---

TypeSpec is a language for describing cloud service APIs and generating other API description languages, client and service code, documentation, and other assets. TypeSpec provides highly extensible core language primitives that can describe API shapes common among REST, GraphQL, gRPC, and other protocols.

You can find more information at https://typespec.io/docs.

This site is focused on using TypeSpec in the context of Azure. We have published a set of libraries with standard patterns and templates to make defining Azure management and data-plane services easy and compliant with Azure API guidelines. Using these building blocks
and guard rails, your service API will be easier to build, will have an easier time passing API reviews, will be consistent with other Azure
services, and will produce good API documentation, good SDKs, and good CLIs.
TypeSpec can emit the following artifacts for your service:

- OpenAPI3 specs
- OpenAPI2 specs, suitable for check-in in to the azure-rest-api-specs repo

# TypeSpec Azure Libraries

## Packages

| Name                                                                          | Type    | Changelog                                        | Latest                                                                                                                                                       | Next                                                                              |
| ----------------------------------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [@azure-tools/typespec-azure-core][typespec-azure-core_src]                   | Library | [Changelog][typespec-azure-core_chg]             | [![](https://img.shields.io/npm/v/@azure-tools/typespec-azure-core)](https://www.npmjs.com/package/@azure-tools/typespec-azure-core)                         | ![](https://img.shields.io/npm/@azure-tools/typespec-azure-core/next)             |
| [@azure-tools/typespec-resource-manager][typespec-azure-resource-manager_src] | Library | [Changelog][typespec-azure-resource-manager_chg] | [![](https://img.shields.io/npm/v/@azure-tools/typespec-azure-resource-manager)](https://www.npmjs.com/package/@azure-tools/typespec-azure-resource-manager) | ![](https://img.shields.io/npm/@azure-tools/typespec-azure-resource-manager/next) |
| [@azure-tools/typespec-autorest][typespec-autorest_src]                       | Emitter | [Changelog][typespec-autorest_chg]               | [![](https://img.shields.io/npm/v/@azure-tools/typespec-autorest)](https://www.npmjs.com/package/@azure-tools/typespec-autorest)                             | ![](https://img.shields.io/npm/v/@azure-tools/typespec-autorest/next)             |

[typespec-autorest_src]: https://github.com/Azure/typespec-azure/tree/main/packages/typespec-autorest
[typespec-autorest_chg]: https://github.com/Azure/typespec-azure/tree/main/packages/typespec-autorest/CHANGELOG.md
[typespec-azure-core_src]: https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-core
[typespec-azure-core_chg]: https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-core/CHANGELOG.md
[typespec-azure-resource-manager_src]: https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-resource-manager
[typespec-azure-resource-manager_chg]: https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-resource-manager/CHANGELOG.md

`@next` version of the package are the latest versions available on the `main` branch.

### Package Layering

The main packages in this repository can be considered a series of layers which progressively add functionality
for specific scenarios:

- [**@azure-tools/typespec-azure-core:**](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-core) Provides core models and interfaces for Azure service modelling
- [**@azure-tools/typespec-azure-resource-manager:**](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-resource-manager) Provides additional models and interfaces for modelling Azure Resource Manager services

## How to Get Help

- Ask questions in the [TypeSpec Discussions Channel](https://teams.microsoft.com/l/channel/19%3a906c1efbbec54dc8949ac736633e6bdf%40thread.skype/TypeSpec%2520Discussion%2520%25F0%259F%2590%25AE?groupId=3e17dcb0-4257-4a30-b843-77f47f1d4121&tenantId=72f988bf-86f1-41af-91ab-2d7cd011db47)
- File issues in the [typespec-azure github repo](https://github.com/azure/typespec-azure/issues)
  - For bugs, please include:
    - A high-level description of the bug
    - Expected and Actual Results
    - Repro steps, including any TypeSpec code that you used
    - Any error messages you saw, including stack traces. For issues with VS or VS Code tooling see [Troubleshooting VSCode Tooling and Filing Issues](./typespec-getting-started.md#troubleshooting-vscode-tooling-and-filing-issues)

## More Information About TypeSpec

Some additional sources:

- Recordings
  - [TypeSpec lunch-and-learn for ARM in Stream Channel](https://msit.microsoftstream.com/channel/97c90840-98dc-b478-19e5-f1ecdab7312b)
  - [TypeSpec lunch-and-learn for Azure SDK](https://microsoft-my.sharepoint.com/:v:/r/personal/scotk_microsoft_com/Documents/Recordings/Lunch%20Learning%20Series%20_%20Mark%20Cowlishaw%20-%20TypeSpec%20Walkthrough-20211117_120334-Meeting%20Recording.mp4?csf=1&web=1&e=27IgaX)
