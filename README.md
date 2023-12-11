testing
# TypeSpec Azure Libraries

[TypeSpec](https://github.com/microsoft/typespec) is a language for describing cloud
service APIs and generating other API description languages, client and
service code, documentation, and other assets.

This repository adds common Azure-specific TypeSpec libraries to the
[TypeSpec](https://github.com/microsoft/typespec) core that is pulled in as a git
submodule.

## Try TypeSpec without installing anything

You can try TypeSpec on the web without installing anything.
[TypeSpec playground for Azure services](https://cadlplayground.z22.web.core.windows.net/cadl-azure/)

## Prerequisites

- Please install Node.js 16 LTS and ensure you are able to run the npm command in a command prompt: `npm --version`.
- It is recommended to have npm 7+. To update npm run `npm install -g npm`

## Getting Started

For TypeSpec language documentation, see https://microsoft.github.io/typespec.

If you are team working on Azure, see TypeSpec Azure development documentation https://azure.github.io/typespec-azure. You should pre-install as well `@azure-tools/typespec-azure-core` to define Azure resources, and `@azure-tools/typespec-autorest` to export in Swagger:

```
npm install @typespec/rest @typespec/openapi3 @azure-tools/typespec-azure-core @azure-tools/typespec-autorest
```

> If you plan to use the output openapi with autorest or any of the azure sdk tooling _you should use typespec-autorest_, the openapi3 emitter is not going to have any of the ms extensions (pageable, lro, client name, etc.) and so it will be losing information.

## Build Pipelines

Information on using TypeSpec within build pipelines [can be found here](./docs/howtos/rest-api-publish/buildpipelines.md)

## Packages

| Name                                                                          | Changelog                                        | Latest                                                                                                                                                       | Next                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [@azure-tools/typespec-autorest][typespec-autorest_src]                       | [Changelog][typespec-autorest_chg]               | [![](https://img.shields.io/npm/v/@azure-tools/typespec-autorest)](https://www.npmjs.com/package/@azure-tools/typespec-autorest)                             | ![](https://img.shields.io/npm/v/@azure-tools/typespec-autorest/next)             |
| [@azure-tools/typespec-azure-core][typespec-azure-core_src]                   | [Changelog][typespec-azure-core_chg]             | [![](https://img.shields.io/npm/v/@azure-tools/typespec-azure-core)](https://www.npmjs.com/package/@azure-tools/typespec-azure-core)                         | ![](https://img.shields.io/npm/@azure-tools/typespec-azure-core/next)             |
| [@azure-tools/typespec-resource-manager][typespec-azure-resource-manager_src] | [Changelog][typespec-azure-resource-manager_chg] | [![](https://img.shields.io/npm/v/@azure-tools/typespec-azure-resource-manager)](https://www.npmjs.com/package/@azure-tools/typespec-azure-resource-manager) | ![](https://img.shields.io/npm/@azure-tools/typespec-azure-resource-manager/next) |

[typespec-autorest_src]: packages/typespec-autorest
[typespec-autorest_chg]: packages/typespec-autorest/CHANGELOG.md
[typespec-azure-core_src]: packages/typespec-azure-core
[typespec-azure-core_chg]: packages/typespec-azure-core/CHANGELOG.md
[typespec-azure-resource-manager_src]: packages/typespec-azure-resource-manager
[typespec-azure-resource-manager_chg]: packages/typespec-azure-resource-manager/CHANGELOG.md

`@next` version of the package are the latest versions available on the `main` branch.

### Package Layering

The main packages in this repository can be considered a series of layers which progressively add functionality
for specific scenarios:

- [**@azure-tools/typespec-azure-core:**](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-core) Provides core models and interfaces for Azure service modelling
- [**@azure-tools/typespec-azure-resource-manager:**](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-resource-manager) Provides additional models and interfaces for modelling Azure Resource Manager services
