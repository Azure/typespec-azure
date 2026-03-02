---
title: "Functions (Experimental)"
description: "Extern functions exported by @azure-tools/typespec-client-generator-core"
toc_min_heading_level: 2
toc_max_heading_level: 3
llmstxt: true
---

:::caution
These functions are experimental and may change in future releases. They require suppressing the `experimental-feature` diagnostic.
:::

## Azure.ClientGenerator.Core

### `replaceParameter` {#replaceParameter}

Replace a parameter in an operation with a new parameter definition or remove it entirely.
This function creates a new operation with the specified parameter replaced or removed,
enabling composable transformations without mutating the original operation.

```typespec
#suppress "experimental-feature" "using experimental replaceParameter function"
extern fn replaceParameter(
  operation: Reflection.Operation,
  selector: valueof string | Reflection.ModelProperty,
  replacement: Reflection.ModelProperty | void
): Reflection.Operation
```

#### Parameters

| Name        | Type                                           | Description                                                                                      |
| ----------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| operation   | `Reflection.Operation`                         | The operation to transform.                                                                      |
| selector    | `valueof string \| Reflection.ModelProperty`   | The parameter to replace, specified either by name (string) or by direct reference.             |
| replacement | `Reflection.ModelProperty \| void`             | The replacement parameter. Use `void` to remove the parameter entirely.                         |

#### Returns

A new `Operation` with the parameter replaced or removed.

#### Examples

##### Making an optional parameter required

```typespec
op getSecrets(@query maxResults?: int32): void;

model RequiredMaxResults {
  maxResults: int32;
}

#suppress "experimental-feature" "using replaceParameter"
@@override(getSecrets, replaceParameter(getSecrets, "maxResults", RequiredMaxResults.maxResults));
```

##### Removing a parameter

```typespec
op myOp(@query param1: string, @query param2?: int32): void;

#suppress "experimental-feature" "using replaceParameter"
alias opWithoutParam2 = replaceParameter(myOp, "param2", void);
```

##### Chaining transformations

```typespec
op complexOp(@query param1?: string, @query param2?: int32): void;

model RequiredParams {
  param1: string;
  param2: int32;
}

#suppress "experimental-feature" "using replaceParameter"
alias step1 = replaceParameter(complexOp, "param1", RequiredParams.param1);
#suppress "experimental-feature" "using replaceParameter"
@@override(complexOp, replaceParameter(step1, "param2", RequiredParams.param2));
```

##### Language-specific override

```typespec
op getSecrets(@query maxResults?: int32): void;

model RequiredMaxResults {
  maxResults: int32;
}

#suppress "experimental-feature" "using replaceParameter"
@@override(getSecrets, replaceParameter(getSecrets, "maxResults", RequiredMaxResults.maxResults), "python");
```

---

### `replaceResponse` {#replaceResponse}

Replace the return type of an operation with a new type.
This function creates a new operation with the return type replaced,
enabling composable transformations without mutating the original operation.

```typespec
#suppress "experimental-feature" "using experimental replaceResponse function"
extern fn replaceResponse(
  operation: Reflection.Operation,
  returnType: unknown
): Reflection.Operation
```

#### Parameters

| Name       | Type                   | Description                                |
| ---------- | ---------------------- | ------------------------------------------ |
| operation  | `Reflection.Operation` | The operation to transform.                |
| returnType | `unknown`              | The new return type for the operation.     |

#### Returns

A new `Operation` with the return type replaced.

#### Examples

##### Changing the return type to a custom model

```typespec
op getData(): string;

model CustomResponse {
  data: string;
  metadata: Record<string>;
}

#suppress "experimental-feature" "using replaceResponse"
@@override(getData, replaceResponse(getData, CustomResponse));
```

##### Chaining with replaceParameter

```typespec
op myOp(@query param?: string): string;

model RequiredParam {
  param: string;
}

model CustomResponse {
  result: string;
}

#suppress "experimental-feature" "using replaceParameter"
alias step1 = replaceParameter(myOp, "param", RequiredParam.param);
#suppress "experimental-feature" "using replaceResponse"
@@override(myOp, replaceResponse(step1, CustomResponse));
```

---

### `addParameter` {#addParameter}

Add a new parameter to an operation.
This function creates a new operation with the additional parameter appended,
enabling composable transformations without mutating the original operation.

```typespec
#suppress "experimental-feature" "using experimental addParameter function"
extern fn addParameter(
  operation: Reflection.Operation,
  parameter: Reflection.ModelProperty
): Reflection.Operation
```

#### Parameters

| Name      | Type                       | Description                                  |
| --------- | -------------------------- | -------------------------------------------- |
| operation | `Reflection.Operation`     | The operation to transform.                  |
| parameter | `Reflection.ModelProperty` | The parameter to add to the operation.       |

#### Returns

A new `Operation` with the parameter added.

#### Examples

##### Adding a required parameter

```typespec
op myOp(@query existingParam: string): void;

model ExtraParams {
  @header("X-Trace-Id") tracingId: string;
}

#suppress "experimental-feature" "using addParameter"
@@override(myOp, addParameter(myOp, ExtraParams.tracingId));
```

##### Chaining with replaceParameter

```typespec
op myOp(@query oldParam?: string): void;

model NewParams {
  oldParam: string;
  newParam: int32;
}

#suppress "experimental-feature" "using replaceParameter"
alias step1 = replaceParameter(myOp, "oldParam", NewParams.oldParam);
#suppress "experimental-feature" "using addParameter"
@@override(myOp, addParameter(step1, NewParams.newParam));
```

##### Adding multiple parameters via chaining

```typespec
op myOp(@query param: string): void;

model ExtraParams {
  param1: int32;
  param2: boolean;
}

#suppress "experimental-feature" "using addParameter"
alias step1 = addParameter(myOp, ExtraParams.param1);
#suppress "experimental-feature" "using addParameter"
@@override(myOp, addParameter(step1, ExtraParams.param2));
```

---

## Usage with `@@override`

These functions are designed to work with the `@@override` decorator to customize method signatures in generated client SDKs. The typical pattern is:

1. Define a model with the desired parameter properties
2. Use `replaceParameter`, `replaceResponse`, or `addParameter` to transform the operation
3. Apply the transformed operation using `@@override`

```typespec
// Original operation
op getSecrets(@query maxResults?: int32): void;

// Define the customized parameters
model CustomParams {
  maxResults: int32;  // Now required instead of optional
}

// Apply the transformation
#suppress "experimental-feature" "using replaceParameter"
@@override(getSecrets, replaceParameter(getSecrets, "maxResults", CustomParams.maxResults));
```

The transformed operation can also be stored in an alias for reuse or further transformations:

```typespec
#suppress "experimental-feature" "using replaceParameter"
alias customGetSecrets = replaceParameter(getSecrets, "maxResults", CustomParams.maxResults);
```
