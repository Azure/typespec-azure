---
title: "Data types"
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

| Name     | Type        | Description                                                                                                                                                                                                     |
| -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| service? | `Namespace` | The service that this client is generated for. If not specified, TCGC will look up the first parent namespace decorated with `@service` for the target.<br />The namespace should be decorated with `@service`. |
| name?    | `string`    | The name of the client. If not specified, the default name will be `<Name of the target>Client`.                                                                                                                |

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

| Name         | Value | Description                                       |
| ------------ | ----- | ------------------------------------------------- |
| individually | `1`   | The client could be initialized individually.     |
| parent       | `2`   | The client could be initialized by parent client. |

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
