---
title: Overview
sidebar_position: 0
---

# TypeSpec AutoRest Library

This is a TypeSpec library that will emit an enriched OpenAPI 2.0 specification that can be consumed by AutoRest.
The generated OpenAPI spec will have custom `x-ms-` extensions properties and conform to standards required by AutoRest to generate a more accurate SDK.

## Getting started

1. Include `@azure-tools/typespec-autorest` dependencies in package.json

```json
{
  ...
  "dependencies": {
    ...
    "@azure-tools/typespec-autorest": "latest"
  }
}
```

2. Run `npm install` to install the dependency
3. Import `@azure-tools/typespec-autorest` in your `main.tsp` file

```typespec
import "@azure-tools/typespec-autorest";
```

4. Run `tsp compile`. This will result in a `swagger.json` file crated in `./tsp-output/swagger.json`

## Use in autorest

Generate the OpenAPI spec as shown above then run autorest cli directly on it.

```bash
autorest --input-file=<path/to/generated/file.json>
# Example
autorest --input-file=./tsp-output/@azure-tools/typespec-autorest/openapi.json --python
```

## Configuration

### Emitter options:

Emitter options can be configured via the `tspconfig.yaml` configuration:

```yaml
emitters:
  '@azure-tools/typespec-autorest':
    <optionName>: <value>


# For example
emitters:
  '@azure-tools/typespec-autorest':
    output-file: my-custom-swagger.json
```

or via the command line with

```bash
--option "@azure-tools/typespec-autorest.<optionName>=<value>"

# For example
--option "@azure-tools/typespec-autorest.output-file=my-custom-swagger.json"
```

#### `azure-resource-provider-folder`

`resource-manager` directory under your service folder are located so the emitter can emit correct sub-folder structure and swagger files for each of the API versions. You must specify it for ARM specs with folder path relative to the TypeSpec files.

#### `emitter-output-dir`

Set the emitter output-dir. [See here](https://microsoft.github.io/typespec/introduction/configuration#emitter-output-dir)

#### `output-file`

Configure the name of the swagger output file relative to the `output-dir`.

Output file will interpolate the following values:

- service-name: Name of the service if multiple
- version: Version of the service if multiple
- azure-resource-provider-folder: Value of the azure-resource-provider-folder option
- version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise.

Default: `{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json`

Example: Single service no versioning

- `openapi.yaml`

Example: Multiple services no versioning

- `openapi.Org1.Service1.yaml`
- `openapi.Org1.Service2.yaml`

Example: Single service with versioning

- `openapi.v1.yaml`
- `openapi.v2.yaml`

Example: Multiple service with versioning

- `openapi.Org1.Service1.v1.yaml`
- `openapi.Org1.Service1.v2.yaml`
- `openapi.Org1.Service2.v1.0.yaml`
- `openapi.Org1.Service2.v1.1.yaml`

Example: azureResourceProviderFolder is provided

- `arm-folder/AzureService/preview/2020-01-01.yaml`
- `arm-folder/AzureService/preview/2020-01-01.yaml`

#### `examples-directory`

Directory where the x-ms-examples are located so the emitter can automatically link.

#### `version`

Select which version should be emitted if the spec support versioning. By default all the version with be emitted in this format `<outputFileName>.<version>.json`

### `new-line`

Set the newline character for emitting files. Can be either:

- `lf`(Default)
- `crlf`

### `omit-unreachable-types`

Only include types referenced via an operation.

## Decorators

- [@collectionFormat](#collectionformat)
- [@example](#example)
- [@useRef](#useref)

### @collectionFormat

Syntax:

```
@collectionFormat(formatString)
```

`@collectionFormat` specifies array property type serialization format. Valid format strings are "csv", "multi", "ssv", "tsv", "pipes" though "csv" or "multi" are recommended.

`@collectionFormat` can only be specified on model properties that are arrays.

### @example

Syntax:

```
@example(pathOrUri, title)
```

`@example` attaches example files to an operation. Multiple examples can be specified.

`@example` can only be specified on operations.

### @useRef

Syntax:

```
@useRef(urlString)
```

`@useRef` is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.

## How to

### Include `x-ms-skip-url-encoding` in `x-ms-parmaeterized-host` parameter

Every parameter of type `uri` in `@server` will be marked with `x-ms-skip-url-encoding`.

```typespec
@server("{endpoint}/v2", "Account endpoint", {endpoint: url})
```

Result in

```json5
{
  in: "path",
  name: "endpoint",
  required: true,
  type: "string",
  format: "uri",
  "x-ms-skip-url-encoding": true,
}
```
