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

| Name            | Type         | Description                                                                                                                         |
| --------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| parameters?     | `Model`      | Redefine the client initialization parameters.                                                                                      |
| access?         | `EnumMember` | Determines the accessibility of the client initialization method. `Access.public` means the client could be initialized separately. |
| accessorAccess? | `EnumMember` | Determines the accessibility of the client accessor method. `Access.public` means client could be got from parent client.           |

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
