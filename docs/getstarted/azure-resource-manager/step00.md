---
title: 1. Installing Tools
---

## Installing IDE Tools

If you use Visual Studio or Visual Studio code, the TypeSpec extensions are an important tool in providing a first class experience for writing, editing, and reviewing TypeSpec. See [Installing the VS and VS Code Extensions](https://typespec.io/docs#install-the-vs-and-vscode-extensions) for details.

## Creating a Service

The Azure Resource Manager Service Project will create a very basic TypeSpec file in `main.tsp`:

```typespec
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
```

These lines import the libraries you will need to build your first service.

**Add the following lines** to bring the models, operations, and decorators you will need into the specification:

```typespec
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Resource.Manager;
```
