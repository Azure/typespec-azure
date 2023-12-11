# Creating a new project

If you installed TypeSpec on your local machine, here is how you can create a new TypeSpec project:

First, open your command prompt (PowerShell, cmd.exe, bash, etc), create an empty folder for your new project, and cd into it. If creating a new service in the [Azure/azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs) repository, create the new service folder following our [directory structure guidelines](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/typespec-structure-guidelines.md).

Now create a new Azure service specification using the tsp init command:

```bash
tsp init https://aka.ms/typespec/core-init

```

You will be prompted with a few questions:

- The service template: choose between "Azure Data Plane Service", "Azure Resource Manager Service"
- The project name: Enter a name to be used as the project folder name or press enter to use the same name as the folder you created
- Update the libraries: Press Enter to continue with the selected packages

The prompts will look something like this:

```bash
TypeSpec compiler v0.34.0

√ Please select a template » Azure Data Plane Service
√ Project name ... myService
√ Update the libraries? » @typespec/rest, @typespec/versioning, @azure-tools/typespec-autorest, @azure-tools/typespec-azure-core
TypeSpec init completed.
```

You can run `tsp install` now to install dependencies.
Once your project files have been created, execute the following command to install the TypeSpec compiler and libraries:

```bash
tsp install
```

You can now open the file `main.tsp` to follow along with the rest of the tutorial!

| Azure Service Type                        | Tutorial                                                | Produces                                                              |
| ----------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Azure Data-Plane Service                  | [Azure-Core tutorial](azure-core/step02)                | OpenApi 2.0 (Swagger) spec                                            |
| Azure Management Service                  | [ARM tutorial](azure-resource-manager/step00)           | OpenApi 2.0 (Swagger) spec                                            |
| Azure Management Service with ProviderHub | [ProviderHub](providerhub/step01-create-userrp-project) | OpenApi 2.0 (Swagger) spec,Full debugable UserRP asp.net core project |
