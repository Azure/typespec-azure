---
title: What is TypeSpec?
---

TypeSpec (Compact API Definition Language) is a typescript-like language for defining APIs. TypeSpec is designed for code reuse,
and for Azure services, there are Azure service extensions for TypeSpec that provide high level building blocks you should use to build
your service. These libraries also contain rules that encourage following established patterns for Azure APIs. Using these building blocks
and guard rails, your service API will be easier to build, will have an easier time passing API reviews, will be consistent with other Azure
services, and will produce good API documentation, good SDKs, and good CLIs.
TypeSpec can emit the following artifacts for your service:

- OpenAPI3 specs
- OpenAPI2 specs, suitable for check-in in to the azure-rest-api-specs repo

For more information on the TypeSpec language and core libraries, see [Getting started with TypeSpec](https://typespec.io/docs)

## Setting up TypeSpec and compile first project

### Install TypeSpec

There are two simple options for getting TypeSpec up and running in your environment:

- [Install directly from npm](https://github.com/microsoft/typespec#using-node--npm)

- Use the [TypeSpec docker images](https://github.com/microsoft/typespec/blob/main/docs/docker.md)

### Create a new TypeSpec Azure project

- Run `tsp init` command with Azure template URL `https://aka.ms/typespec/azure-init` to create a new TypeSpec Azure project for ARM or Data-plane service APIs. This will initialize an empty TypeSpec project with correct npm package references and emitter settings for Azure services.

- Run `tsp compile` in the project folder will compile the TypeSpec project and emit output in `tsp-output` folder.

Once TypeSpec project has been create, the [TypeSpec language tutorial](https://typespec.io/docs) provides a good overview of the basics of the language.

## Getting Started for Azure Management Plane Services

Use the resources in this section for creating Azure ARM rest API specs. For ProviderHub User RP specs and service implementation, please follow the steps in the next section.

- Documentation
  - [TypeSpec Azure ARM library](https://github.com/Azure/typespec-azure/tree/main/packages/typespec-azure-resource-manager/README.md)

## Getting Started for Azure Data Plane Services

- Documentation
  - [Getting started with TypeSpec for REST APIs](https://github.com/microsoft/typespec/blob/main/README.md#getting-started)
  - [TypeSpec language tutorial](https://typespec.io/docs)
  - [TypeSpec Swagger Cheat Sheet](https://github.com/microsoft/typespec/blob/main/docs/typespec-for-openapi-dev.md)
- Samples
  - [Petstore Sample using Low-level Http APIs](https://github.com/microsoft/typespec/tree/main/packages/samples/petstore)
  - [Petstore Sample using High-level Resource APis](https://github.com/microsoft/typespec/tree/main/packages/samples/rest/petstore)
  - You can also browse the [Samples package](https://github.com/microsoft/typespec/tree/main/packages/samples)
- Video Walkthroughs
  - [Getting Started with TypeSpec](https://microsoft.sharepoint.com/:v:/t/AzureDeveloperExperience/Ee5JOjqLOFFDstWe6yB0r20BXozakjHy7w2adGxQi5ztJg?e=QgqqhQ)

## How to Get Help

- Ask questions in the [TypeSpec Discussions Channel](https://teams.microsoft.com/l/channel/19%3a906c1efbbec54dc8949ac736633e6bdf%40thread.skype/TypeSpec%2520Discussion%2520%25F0%259F%2590%25AE?groupId=3e17dcb0-4257-4a30-b843-77f47f1d4121&tenantId=72f988bf-86f1-41af-91ab-2d7cd011db47)
- File issues in the [typespec-azure github repo](https://github.com/azure/typespec-azure/issues)
  - For bugs, please include:
    - A high-level description of the bug
    - Expected and Actual Results
    - Repro steps, including any TypeSpec code that you used
    - Any error messages you saw, including stack traces. For issues with VS or VS Code tooling see [Troubleshooting VSCode Tooling and Filing Issues](#troubleshooting-vscode-tooling-and-filing-issues)

### Troubleshooting VSCode Tooling and Filing Issues

If you run into a problem with the TypeSpec-specific tooling in VS Code, please try to capture the issue, and include any log information. If IntelliSense, syntax highlighting or other language features don't appear to be working:

- Ensure that 'TypeSpec' is the selected language format for your document (this should happen automatically if your file uses the .tsp suffix)
  ![image](https://user-images.githubusercontent.com/1054056/144310539-4e9bfbb9-1366-4b6f-a490-875e9bd68669.png)
- Choose Output from the View menu to see the output of the language server (View -> Output)
  ![image](https://user-images.githubusercontent.com/1054056/144310719-4bca242f-f11c-484c-91c7-6914fcf7fe3a.png)
- Capture any output, including stack traces, and include in your [github issue](https://github.com/azure/typespec-azure/issues).
  ![image](https://user-images.githubusercontent.com/1054056/144310907-ec945f54-0fd8-40a4-936c-60669f4a052f.png)
- Restart VS Code to restart the language server

## More Information About TypeSpec

Some additional sources:

- Recordings
  - [TypeSpec lunch-and-learn for ARM in Stream Channel](https://msit.microsoftstream.com/channel/97c90840-98dc-b478-19e5-f1ecdab7312b)
  - [TypeSpec lunch-and-learn for Azure SDK](https://microsoft-my.sharepoint.com/:v:/r/personal/scotk_microsoft_com/Documents/Recordings/Lunch%20Learning%20Series%20_%20Mark%20Cowlishaw%20-%20TypeSpec%20Walkthrough-20211117_120334-Meeting%20Recording.mp4?csf=1&web=1&e=27IgaX)
