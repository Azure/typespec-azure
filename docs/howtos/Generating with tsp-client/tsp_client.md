# Getting started with `tsp-client`

:::info
**Short link:** [aka.ms/azsdk/tsp-client](https://aka.ms/azsdk/tsp-client)
:::

`tsp-client` is a simple command line tool to facilitate generating client libraries from TypeSpec.

## Installation

```
npm install -g @azure-tools/typespec-client-generator-cli
```

## Usage

```
tsp-client <command> [options]
```

## Commands

Use one of the supported commands to get started generating clients from a TypeSpec project.
This tool will default to using your current working directory to generate clients in and will
use it to look for relevant configuration files. To specify a different output directory, use
the `-o` or `--output-dir` option.

### init

Initialize the client library directory using a tspconfig.yaml. When running this command pass in a path to a local or remote tspconfig.yaml with the `-c` or `--tsp-config` flag.

The `init` command generates a directory structure following the standard pattern used across Azure SDK language repositories, creates a [tsp-location.yaml](#tsp-locationyaml) file to control generation, and performs an initial generation of the client library. If you want to skip client library generation, then pass the `--skip-sync-and-generate` flag.

:::warning
This command should be run from the root of the repository. Example repository root: `azure-sdk-for-python/`
:::

Example:

```
azure-sdk-for-python> tsp-client init -c https://github.com/Azure/azure-rest-api-specs/blob/431eb865a581da2cd7b9e953ae52cb146f31c2a6/specification/contosowidgetmanager/Contoso.WidgetManager/tspconfig.yaml
```

### update

The `update` command will look for a [tsp-location.yaml](#tsp-locationyaml) file in your current directory to sync a TypeSpec project and generate a client library. The update flow calls the `sync` and `generate` commands internally, so if you need to separate these steps, use the `sync` and `generate` commands separately instead.

Example:

```
azure-sdk-for-python/sdk/contosowidgetmanager/azure-contoso-widgetmanager> tsp-client update
```

### sync

Sync a TypeSpec project with the parameters specified in tsp-location.yaml.

By default the `sync` command will look for a tsp-location.yaml to get the project details and sync them to a temporary directory called `TempTypeSpecFiles`. Alternately, you can pass in the `--local-spec-repo` flag with the path to your local TypeSpec project to pull those files into your temporary directory.

Example:

```
azure-sdk-for-python/sdk/contosowidgetmanager/azure-contoso-widgetmanager> tsp-client sync
```

### generate

Generate a client library from a TypeSpec project. The `generate` command should be run after the `sync` command. `generate` relies on the existence of the `TempTypeSpecFiles` directory created by the `sync` command and on an `emitter-package.json` file checked into your repository at the following path: `<repo root>/eng/emitter-package.json`. The `emitter-package.json` file is used to install project dependencies and get the appropriate emitter package.

Example:

```
azure-sdk-for-python/sdk/contosowidgetmanager/azure-contoso-widgetmanager> tsp-client generate
```

### convert

Convert an existing swagger specification to a TypeSpec project. This command should only be run once to get started working on a TypeSpec project. TypeSpec projects will need to be optimized manually and fully reviewed after conversion. When using this command a path or url to a swagger README file is required through the `--swagger-readme` flag.

Example:

```
azure-rest-api-specs/specification/contosowidgetmanager> tsp-client convert --swagger-readme ./data-plane/readme.md -o ./Contoso.WidgetManager
```

## Options

```
  --arm                     Convert ARM swagger specification to TypeSpec       [boolean]
  -c, --tsp-config          The tspconfig.yaml file to use                      [string]
  --commit                  Commit to be used for project init or update        [string]
  -d, --debug               Enable debug logging                                [boolean]
  --emitter-options         The options to pass to the emitter                  [string]
  --generate-lock-file      Generate a lock file under the eng/ directory from
                            an existing emitter-package.json                    [boolean]
  -h, --help                Show help                                           [boolean]
  --local-spec-repo         Path to local repository with the TypeSpec project  [string]
  --save-inputs             Don't clean up the temp directory after generation  [boolean]
  --skip-sync-and-generate  Skip sync and generate during project init          [boolean]
  --swagger-readme          Path or url to swagger readme file                  [string]
  -o, --output-dir          Specify an alternate output directory for the
                            generated files. Default is your current directory  [string]
  --repo                    Repository where the project is defined for init
                            or update                                           [string]
  -v, --version             Show version number                                 [boolean]
```

## Important concepts

### Per project setup

Each project will need to have a configuration file called tsp-location.yaml that will tell the tool where to find the TypeSpec project.

#### tsp-location.yaml

This file is created through the `tsp-client init` command or you can manually create it under the project directory to run other commands supported by this tool.

:::info
This file should live under the project directory for each service.
:::

The file has the following properties:

| Property              | Description                                                                                                                                                                                                                                                                                           | IsRequired            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| directory             | The top level directory where the main.tsp for the service lives. This should be relative to the spec repo root such as `specification/cognitiveservices/OpenAI.Inference`                                                                                                                            | true                  |
| additionalDirectories | Sometimes a typespec file will use a relative import that might not be under the main directory. In this case a single `directory` will not be enough to pull down all necessary files. To support this you can specify additional directories as a list to sync so that all needed files are synced. | false: default = null |
| commit                | The commit sha for the version of the typespec files you want to generate off of. This allows us to have idempotence on generation until we opt into pointing at a later version.                                                                                                                     | true                  |
| repo                  | The repo this spec lives in. This should be either `Azure/azure-rest-api-specs` or `Azure/azure-rest-api-specs-pr`.                                                                                                                                                                                   | true                  |

Example:

```yml
directory: specification/contosowidgetmanager/Contoso.WidgetManager
commit: 431eb865a581da2cd7b9e953ae52cb146f31c2a6
repo: Azure/azure-rest-api-specs
additionalDirectories:
  - specification/contosowidgetmanager/Contoso.WidgetManager.Shared/
```

## Per repository set up

Each repository that intends to support `tsp-client` for generating and updating client libraries will need to set up an `emitter-package.json` file under the `eng/` directory at the root of the repository. Client libraries generated with this tool will be outputted based on the information in the tspconfig.yaml file of the TypeSpec specification. The service directory is specified through the `parameters.service-dir.default` parameter in tspconfig.yaml, additionally the `package-dir` option for the specific emitter is appended to the end of the path.

See the following example of a valid tspconfig.yaml file: https://github.com/Azure/azure-rest-api-specs/blob/main/specification/contosowidgetmanager/Contoso.WidgetManager/tspconfig.yaml

Using the tspconfig.yaml linked above, by default, the client libraries will be generated in the following directory for C#: `<repo>/sdk/contosowidgetmanager/Azure.Template.Contoso/`.

### Required set up

Please note that these requirements apply on the repository where the client library is going to be generated. Repo owners should make sure to follow these requirements. Users working within a repository that already accepts this tool can refer to the [Usage](#usage) section.

- Add an emitter-package.json to the repo following this [configuration](#emitter-packagejson).
- Add the [TempTypeSpecFiles](#TempTypeSpecFiles) directory to the .gitignore file for your repository.

### TempTypeSpecFiles

This tool creates a `TempTypeSpecFiles` directory when syncing a TypeSpec project to your local repository. This temporary folder will contain a copy of the TypeSpec project specified by the parameters set in the tsp-location.yaml file. If you pass the `--save-inputs` flag to the commandline tool, this directory will not be deleted. Repositories should add an entry in the .gitignore so that none of these files are accidentally checked in if `--save-inputs` flag is passed in.

```text
# .gitignore file
TempTypeSpecFiles/
```

### emitter-package.json (Required)

`emitter-package.json` will be used the same as a `package.json` file. If the is no `emitter-package-lock.json` file, the tool will run `npm install` on the contents of `emitter-package.json`. This file allows each repository to pin the version of their emitter and other dependencies to be used when generating client libraries.
The file should be checked into this location `<root of repo>/eng/emitter-package.json`

Example:

```json
{
  "main": "dist/src/index.js",
  "dependencies": {
    "@azure-tools/typespec-python": "0.21.0"
  }
}
```

:::note
tsp compile currently requires the "main" line to be there.
:::

This file replaces the package.json checked into the `azure-rest-api-spec` repository.

### emitter-package-lock.json (Optional)

`emitter-package-lock.json` will be used the same as a `package-lock.json`. The tool will run a clean npm installation before generating client libraries. This file allows consistent dependency trees and allows each repository to control their dependency installation.
The file should be checked into this location: `<root of repo>/eng/emitter-package-lock.json`

:::warning
The tool will run `npm ci` to install dependencies, so ensure that the `emitter-package-lock.json` and `emitter-package.json` files both exist and are in sync with each other.
:::
