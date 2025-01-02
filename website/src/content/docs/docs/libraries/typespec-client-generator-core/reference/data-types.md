---
title: "Data types"
---

## Azure.ClientGenerator.Core

### `ClientInitializationOptions` {#Azure.ClientGenerator.Core.ClientInitializationOptions}

Client initialization options.

```typespec
model Azure.ClientGenerator.Core.ClientInitializationOptions
```

#### Properties

| Name            | Type         | Description                                                       |
| --------------- | ------------ | ----------------------------------------------------------------- |
| parameters?     | `Model`      | Redefine the client initialization parameters.                    |
| access?         | `EnumMember` | Determines the accessibility of the client initialization method. |
| accessorAccess? | `EnumMember` | Determines the accessibility of the client accessor method.       |

### `Access` {#Azure.ClientGenerator.Core.Access}

Access value.

```typespec
enum Azure.ClientGenerator.Core.Access
```

| Name     | Value        | Description    |
| -------- | ------------ | -------------- |
| public   | `"public"`   | Open to user   |
| internal | `"internal"` | Hide from user |

### `Usage` {#Azure.ClientGenerator.Core.Usage}

Usage value.

```typespec
enum Azure.ClientGenerator.Core.Usage
```

| Name   | Value | Description      |
| ------ | ----- | ---------------- |
| input  | `2`   | Used in request  |
| output | `4`   | Used in response |
