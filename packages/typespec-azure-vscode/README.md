# TypeSpec Azure Extension in Visual Studio Code

[Repository](https://github.com/chunyu3/typespec-azure) | [Documentation](https://azure.github.io/typespec-azure/docs/intro/) | [Issues](https://github.com/Azure/typespec-azure/issues) | [Samples](https://github.com/Azure/typespec-azure/tree/main/packages/samples/specs)

The TypeSpec Azure extension for Visual Studio Code helps write TypeSpec for Azure Services and prepares Azure Services to emit first-party client libraries for five supported languages - .NET, Python, Java, JS/TS Go. It includes all the following features built for Azure.:

- Set up Typespec project using Azure templates
- Emit first-party client libraries for five supported languages
- Preview API documentation from TypeSpec

## Prerequisites

Before using the TypeSpec Azure extension, install [Node.js](https://nodejs.org/en/download/) and verify npm is available:

```sh
npm --version
```

Install the TypeSpec CLI:

```sh
npm install -g @typespec/compiler
```

Install the TypeSpec extension from Visual Studio Marketplace.

Other necessary installations will be prompted within the extension as needed.

## Commands

The extension provides the following commands:

| **Command**                                 | **Description**                                                     |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `TypeSpec-azure: Create TypeSpec Project`   | Scaffold a new TypeSpec project.                                    |
| `TypeSpec-azure: Emit From TypeSpec`        | Compile and generate from TypeSpec files into the specified output. |
| `TypeSpec-azure: Preview API Documentation` | Preview API documentation generated from TypeSpec in the workspace. |

## Configuration

TypeSpec will interpolate a few variables using this pattern `${<name>}`. For example `${workspaceFolder}`.

Available variables:

- `workspaceFolder`: Correspond to the root of your Visual Studio workspace.
