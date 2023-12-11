---
title: "Decorators"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Decorators

## Autorest

### `@example` {#@Autorest.example}

`@example` - attaches example files to an operation. Multiple examples can be specified.

`@example` can be specified on Operations.

```typespec
@Autorest.example(pathOrUri: valueof string, title: valueof string)
```

#### Target

`Operation`

#### Parameters

| Name      | Type                    | Description                              |
| --------- | ----------------------- | ---------------------------------------- |
| pathOrUri | `valueof scalar string` | path or Uri to the example file.         |
| title     | `valueof scalar string` | name or description of the example file. |

### `@useRef` {#@Autorest.useRef}

`@useRef` - is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.

`@useRef` can be specified on Models and ModelProperty.

```typespec
@Autorest.useRef(jsonRef: valueof string)
```

#### Target

`union Model | ModelProperty`

#### Parameters

| Name    | Type                    | Description                       |
| ------- | ----------------------- | --------------------------------- |
| jsonRef | `valueof scalar string` | path or Uri to an OpenAPI schema. |
