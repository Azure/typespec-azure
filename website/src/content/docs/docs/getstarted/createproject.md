---
title: Creating a project
---

If you've installed TypeSpec on your local machine, you can create a new TypeSpec project by following these steps:

1. **Open your command prompt** (PowerShell, cmd.exe, bash, etc.), create an empty folder for your new project, and `cd` into it.
2. If creating a new service in the [Azure/azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs) repository, create the new service folder following our [directory structure guidelines](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/typespec-structure-guidelines.md).
3. To create a new Azure service specification, use the `tsp init` command:

```bash
tsp init https://aka.ms/typespec/azure-init
```

You will be prompted with a few questions regarding the service template, project name, and library updates.

### Understanding Project Templates

When initializing a new project, you'll encounter four templates:

| Template Name                                                   | Description                                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **(rest-api-spec repo) Azure Data Plane Service Project**       | This template is configured for projects within the `azure-rest-api-specs` repository, with settings that comply with the repo's requirements, such as file paths and linting rules. |
| **(rest-api-spec repo) Azure Resource Manager Service Project** | Similar to the above, but tailored for Azure Resource Manager services within the `azure-rest-api-specs` repository.                                                                 |
| **(standalone) Azure Data Plane Service Project**               | This template is configured for local use or in a personal repo, allowing for API development without the specific directory structure of the `azure-rest-api-specs` repo.           |
| **(standalone) Azure Resource Manager Service Project**         | Similar to the above but designed for Azure Resource Manager services, configured for local use or in a personal repo.                                                               |

### Target Users

- **Rest-API-Spec Repo Projects**: Ideal for those contributing directly to the Azure REST API specifications, ensuring production-quality SDK generation.
- **Standalone Projects**: Suited for API-first development, allowing users to generate OpenAPI specs, service code, and clients without conforming to the specs repo's structure.

### Install the dependencies

Now that the new project has been created, you can install the dependencies by running the following command:

- `npm ci` - If in the `azure-rest-api-specs` repo.
- `tsp install` - If a standalone project

After setting up your project, run `tsp install` to install dependencies. You can then open the file `main.tsp` to continue with the tutorial. Choose the tutorial that matches your chosen project template:

| Azure Service Type       | Tutorial                                      | Produces                   |
| ------------------------ | --------------------------------------------- | -------------------------- |
| Azure Data-Plane Service | [Azure-Core tutorial](azure-core/step01)      | OpenApi 2.0 (Swagger) spec |
| Azure Management Service | [ARM tutorial](azure-resource-manager/step00) | OpenApi 2.0 (Swagger) spec |
