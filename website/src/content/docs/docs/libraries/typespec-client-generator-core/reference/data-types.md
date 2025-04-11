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

| Name           | Type                  | Description                                                                                                                                                                                                                                                                                     |
| -------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| parameters?    | `Model`               | Redefine the client initialization parameters you would like to add to the client.<br />By default, we apply endpoint, credential, and api-version parameters. If you specify parameters model, we will append the properties of the model to the parameters list of the client initialization. |
| initializedBy? | `EnumMember \| Union` | Determines how the client could be initialized. Use `InitializedBy` enum to set the value. The value could be `InitializedBy.individually`, `InitializedBy.parent` or `InitializedBy.individually \| InitializedBy.parent`.                                                                     |

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

| Name   | Value | Description      |
| ------ | ----- | ---------------- |
| input  | `2`   | Used in request  |
| output | `4`   | Used in response |
