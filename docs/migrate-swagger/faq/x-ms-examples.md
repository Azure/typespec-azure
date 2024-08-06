---
title: x-ms-examples example files
---

The `x-ms-examples` is automatically populated in the generated OpenAPI 2.0 when using the `typespec-autorest` emitter.
The examples must be placed in the `examples-directory` (default to `{project-root}/examples`) and have the `operationdId` property.

:::warning
Do not use `@extension("x-ms-examples", "<value>")`.
:::

## Example structure

Example below assume `example-directory` is `{project-root}/examples`.

- Single version structure

```
main.tsp
examples/
  example1.json
  example2.json
```

- Multi version structure

```
main.tsp
examples/
  2021-01-01/
    example1.json
    example2.json
  2021-01-02/
    example1.json
    example2.json
```

## Generate the examples

To generate the examples you can use [oav](https://github.com/Azure/oav). You can run that on the generated openapi.json file.

Generating basic examples and then manually modify the values. It will generate two examples for each operation: one contains minimal properties set, the other contains the maximal properties set. Since the auto-generated examples consist of random values for most types, you need replace them with meaningful values.

```bash
oav generate-examples openapi.json
```

Note, latest OAV tool should automatically generate the following. However, if you are generating the examples manually, please ensure you have:

- include `title` field and make sure it is descriptive and unique for each operation.
- include `operationId`. This is used to match with declared operations in TypeSpec and correctly output in swagger.

:::warning
The examples are now in the examples directory relative to the output openapi.json. You must now copy them to the examples directory in the project root. The typespec-autorest emitter will then copy them back to the correct location when generating the OpenAPI 2.0.
:::
