---
title: "Data types"
description: "Data types exported by @azure-tools/typespec-client-generator-core"
llmstxt: true
---

## Azure.ClientGenerator.Core

### `ClientInitializationOptions` {#Azure.ClientGenerator.Core.ClientInitializationOptions}

Client initialization customization options.

```typespec
model Azure.ClientGenerator.Core.ClientInitializationOptions
```

#### Properties

| Name           | Type                  | Description                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| parameters?    | `Model`               | Redefine the client initialization parameters you would like to add to the client. All the model properties should have corresponding operation level parameters.<br />By default, we apply endpoint, credential, and API version parameters. If you specify a parameters model, we will append the properties of the model to the parameters list of the client initialization. |
| initializedBy? | `EnumMember \| Union` | Determines how the client can be initialized. Use `InitializedBy` enum to set the value. The value can be `InitializedBy.individually`, `InitializedBy.parent` or `InitializedBy.individually \| InitializedBy.parent`.                                                                                                                                                          |

### `ClientOptions` {#Azure.ClientGenerator.Core.ClientOptions}

Client customization options.

```typespec
model Azure.ClientGenerator.Core.ClientOptions
```

#### Properties

| Name     | Type                       | Description                                                                                                                                                                                                      |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| service? | `Namespace \| Namespace[]` | The services that this client is generated for. If not specified, TCGC will look up the first parent namespace decorated with `@service` for the target.<br />The namespace should be decorated with `@service`. |
| name?    | `string`                   | The name of the client. If not specified, the default name will be `<Name of the target>Client`.                                                                                                                 |

### `ExternalType` {#Azure.ClientGenerator.Core.ExternalType}

Represents an external type that can be used in alternate type definitions.

```typespec
model Azure.ClientGenerator.Core.ExternalType
```

#### Properties

| Name        | Type     | Description                                                                             |
| ----------- | -------- | --------------------------------------------------------------------------------------- |
| identity    | `string` | The identity of the external type. For example, `pystac.Collection`                     |
| package?    | `string` | The package that exports the external type. For example, `pystac`                       |
| minVersion? | `string` | The minimum version of the package to use for your external type. For example, `1.13.0` |

### `Access` {#Azure.ClientGenerator.Core.Access}

Access value.

```typespec
enum Azure.ClientGenerator.Core.Access
```

| Name     | Value        | Description    |
| -------- | ------------ | -------------- |
| public   | `"public"`   | Open to user   |
| internal | `"internal"` | Hide from user |

### `DocumentationMode` {#Azure.ClientGenerator.Core.DocumentationMode}

Defines how client documentation should be applied

```typespec
enum Azure.ClientGenerator.Core.DocumentationMode
```

| Name    | Value       | Description                                        |
| ------- | ----------- | -------------------------------------------------- |
| append  | `"append"`  | Append client documentation to the existing doc    |
| replace | `"replace"` | Replace the existing doc with client documentation |

### `InitializedBy` {#Azure.ClientGenerator.Core.InitializedBy}

InitializedBy value.

```typespec
enum Azure.ClientGenerator.Core.InitializedBy
```

| Name         | Value | Description                                                   |
| ------------ | ----- | ------------------------------------------------------------- |
| none         |       | The client initialization should be omitted and hand-written. |
| individually | `1`   | The client could be initialized individually.                 |
| parent       | `2`   | The client could be initialized by parent client.             |

### `Usage` {#Azure.ClientGenerator.Core.Usage}

Usage value.

```typespec
enum Azure.ClientGenerator.Core.Usage
```

| Name   | Value | Description                 |
| ------ | ----- | --------------------------- |
| input  | `2`   | Used in request             |
| output | `4`   | Used in response            |
| json   | `256` | Used with JSON content type |
| xml    | `512` | Used with XML content type  |
