# Installation

## Try TypeSpec without installing anything

You can try TypeSpec on the web without installing anything.

- [TypeSpec playground](https://aka.ms/trytypespec)
- [TypeSpec playground for Azure services](https://azure.github.io/typespec-azure/playground)

### Installing TypeSpec core toolset

See https://typespec.io/docs

## Installing TypeSpec Azure toolsets

To work on Azure with TypeSpec, you should pre-install `@azure-tools/typespec-azure-core` to define Azure resources, and `@azure-tools/typespec-autorest` to export in Swagger. In other words:

```bash
npm install @typespec/rest @typespec/openapi3 @azure-tools/typespec-azure-core @azure-tools/typespec-autorest
```

> If you plan to use the output openapi with autorest or any of the azure sdk tooling _you should use typespec-autorest_, the openapi3 emitter is not going to have any of the ms extensions (pageable, lro, client name, etc.) and so it will be losing information.
