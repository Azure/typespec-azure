---
title: "Decorators"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

## Azure.Core

### `@finalLocation` {#@Azure.Core.finalLocation}

Identifies a ModelProperty as containing the final location for the operation result.

```typespec
@Azure.Core.finalLocation(finalResult?: Model | void)
```

#### Target

`ModelProperty`

#### Parameters

| Name        | Type            | Description                                                                                                                                                        |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| finalResult | `Model \| void` | Sets the expected return value for the final result. Overrides<br />any value provided in the decorated property, if the property uses ResourceLocation<Resource>. |

### `@finalOperation` {#@Azure.Core.finalOperation}

Identifies that an operation is the final operation for an LRO.

```typespec
@Azure.Core.finalOperation(linkedOperation: Operation, parameters?: {})
```

#### Target

`Operation`

#### Parameters

| Name            | Type        | Description                                                                                                               |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| linkedOperation | `Operation` | The linked Operation                                                                                                      |
| parameters      | `{}`        | Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will<br />be passed to the linked operation request. |

### `@fixed` {#@Azure.Core.fixed}

Marks an Enum as being fixed since enums in Azure are
assumed to be extensible.

```typespec
@Azure.Core.fixed
```

#### Target

`Enum`

#### Parameters

None

### `@items` {#@Azure.Core.items}

Identifies the ModelProperty that contains the paged items. Can only be used on a Model marked with `@pagedResult`.

```typespec
@Azure.Core.items
```

#### Target

`ModelProperty`

#### Parameters

None

### `@lroCanceled` {#@Azure.Core.lroCanceled}

Used for custom StatusMonitor implementation.
Identifies an EnumMember as a long-running "Canceled" terminal state.

```typespec
@Azure.Core.lroCanceled
```

#### Target

`EnumMember | UnionVariant`

#### Parameters

None

### `@lroErrorResult` {#@Azure.Core.lroErrorResult}

Used for custom StatusMonitor implementation.
Identifies a model property of a StatusMonitor as containing the result
of a long-running operation that terminates unsuccessfully (Failed).

```typespec
@Azure.Core.lroErrorResult
```

#### Target

`ModelProperty`

#### Parameters

None

### `@lroFailed` {#@Azure.Core.lroFailed}

Used for custom StatusMonitor implementation.
Identifies an enum member as a long-running "Failed" terminal state.

```typespec
@Azure.Core.lroFailed
```

#### Target

`EnumMember | UnionVariant`

#### Parameters

None

### `@lroResult` {#@Azure.Core.lroResult}

Used for custom StatusMonitor implementation.
Identifies a model property of a StatusMonitor as containing the result
of a long-running operation that terminates successfully (Succeeded).

```typespec
@Azure.Core.lroResult
```

#### Target

`ModelProperty`

#### Parameters

None

### `@lroStatus` {#@Azure.Core.lroStatus}

Used for custom StatusMonitor implementation.
Identifies an Enum or ModelProperty as containing long-running operation
status.

```typespec
@Azure.Core.lroStatus
```

#### Target

`Enum | Union | ModelProperty`

#### Parameters

None

### `@lroSucceeded` {#@Azure.Core.lroSucceeded}

Used for custom StatusMonitor implementation.
Identifies an EnumMember as a long-running "Succeeded" terminal state.

```typespec
@Azure.Core.lroSucceeded
```

#### Target

`EnumMember | UnionVariant`

#### Parameters

None

### `@nextLink` {#@Azure.Core.nextLink}

Identifies a ModelProperty that contains the next link value. Can only be used on a Model marked with `@pagedResult`.

```typespec
@Azure.Core.nextLink
```

#### Target

`ModelProperty`

#### Parameters

None

### `@nextPageOperation` {#@Azure.Core.nextPageOperation}

Identifies that an operation is used to retrieve the next page for paged operations.

```typespec
@Azure.Core.nextPageOperation(linkedOperation: Operation, parameters?: {})
```

#### Target

`Operation`

#### Parameters

| Name            | Type        | Description                                                                                                               |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| linkedOperation | `Operation` | The linked Operation                                                                                                      |
| parameters      | `{}`        | Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will<br />be passed to the linked operation request. |

### `@operationLink` {#@Azure.Core.operationLink}

Identifies an operation that is linked to the target operation.

```typespec
@Azure.Core.operationLink(linkedOperation: Operation, linkType: valueof string, parameters?: {})
```

#### Target

`Operation`

#### Parameters

| Name            | Type             | Description                                                                                                               |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| linkedOperation | `Operation`      | The linked Operation                                                                                                      |
| linkType        | `valueof string` | A string indicating the role of the linked operation                                                                      |
| parameters      | `{}`             | Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will<br />be passed to the linked operation request. |

### `@pagedResult` {#@Azure.Core.pagedResult}

Marks a Model as a paged collection.

```typespec
@Azure.Core.pagedResult
```

#### Target

`Model`

#### Parameters

None

### `@pollingLocation` {#@Azure.Core.pollingLocation}

Identifies a model property as containing the location to poll for operation state.

```typespec
@Azure.Core.pollingLocation(options?: Azure.Core.PollingOptions)
```

#### Target

`ModelProperty`

#### Parameters

| Name    | Type                                                          | Description                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options | [`PollingOptions`](./data-types.md#Azure.Core.PollingOptions) | PollingOptions for the poller pointed to by this link. Overrides<br />settings derived from property value it is decorating, if the value of the<br />property is ResourceLocation<Resource> |

### `@pollingOperation` {#@Azure.Core.pollingOperation}

Identifies that an operation is a polling operation for an LRO.

```typespec
@Azure.Core.pollingOperation(linkedOperation: Operation, parameters?: {})
```

#### Target

`Operation`

#### Parameters

| Name            | Type        | Description                                                                                                               |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| linkedOperation | `Operation` | The linked Operation                                                                                                      |
| parameters      | `{}`        | Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will<br />be passed to the linked operation request. |

### `@pollingOperationParameter` {#@Azure.Core.pollingOperationParameter}

Used to define how to call custom polling operations for long-running operations.

```typespec
@Azure.Core.pollingOperationParameter(targetParameter?: ModelProperty | string)
```

#### Target

`ModelProperty`

#### Parameters

| Name            | Type                      | Description                                                                                                                                                                                        |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| targetParameter | `ModelProperty \| string` | A reference to the polling operation parameter this parameter<br />provides a value for, or the name of that parameter. The default value is the name of<br />the decorated parameter or property. |

### `@useFinalStateVia` {#@Azure.Core.useFinalStateVia}

Overrides the final state value for an operation

```typespec
@Azure.Core.useFinalStateVia(finalState: valueof "original-uri" | "operation-location" | "location" | "azure-async-operation")
```

#### Target

`Operation`

#### Parameters

| Name       | Type                                                                                      | Description                   |
| ---------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| finalState | `valueof "original-uri" \| "operation-location" \| "location" \| "azure-async-operation"` | The desired final state value |

## Azure.Core.Foundations

### `@omitKeyProperties` {#@Azure.Core.Foundations.omitKeyProperties}

Deletes any key properties from the model.

```typespec
@Azure.Core.Foundations.omitKeyProperties
```

#### Target

`Model`

#### Parameters

None

### `@requestParameter` {#@Azure.Core.Foundations.requestParameter}

Identifies a property on a request model that serves as a linked operation parameter.

```typespec
@Azure.Core.Foundations.requestParameter(name: valueof string)
```

#### Target

`Model`

#### Parameters

| Name | Type             | Description                 |
| ---- | ---------------- | --------------------------- |
| name | `valueof string` | Property name on the target |

### `@responseProperty` {#@Azure.Core.Foundations.responseProperty}

Identifies a property on _all_ non-error response models that serve as a linked operation parameter.

```typespec
@Azure.Core.Foundations.responseProperty(name: valueof string)
```

#### Target

`Model`

#### Parameters

| Name | Type             | Description                 |
| ---- | ---------------- | --------------------------- |
| name | `valueof string` | Property name on the target |

## Azure.Core.Traits

### `@trait` {#@Azure.Core.Traits.trait}

`@trait` marks a model type as representing a 'trait' and performs basic validation
checks.

```typespec
@Azure.Core.Traits.trait(traitName?: valueof string)
```

#### Target

The model type to mark as a trait.
`Model`

#### Parameters

| Name      | Type             | Description                                                                                        |
| --------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| traitName | `valueof string` | An optional name to uniquely identify the trait. If unspecified,<br />the model type name is used. |

### `@traitAdded` {#@Azure.Core.Traits.traitAdded}

Sets the version for when the trait was added to the specification. Can be applied
to either a trait model type or its envelope property.

```typespec
@Azure.Core.Traits.traitAdded(addedVersion: EnumMember | null)
```

#### Target

`Model | ModelProperty`

#### Parameters

| Name         | Type                 | Description                                       |
| ------------ | -------------------- | ------------------------------------------------- |
| addedVersion | `EnumMember \| null` | The enum member representing the service version. |

### `@traitContext` {#@Azure.Core.Traits.traitContext}

`@traitContext` sets the applicable context for a trait on its envelope property.

```typespec
@Azure.Core.Traits.traitContext(contexts: EnumMember | Union | unknown)
```

#### Target

The trait envelope property where the context will be applied.
`ModelProperty`

#### Parameters

| Name     | Type                             | Description                                                                                |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| contexts | `EnumMember \| Union \| unknown` | An enum member or union of enum members representing the trait's<br />applicable contexts. |

### `@traitLocation` {#@Azure.Core.Traits.traitLocation}

`@traitLocation` sets the applicable location for a trait on its envelope property.

```typespec
@Azure.Core.Traits.traitLocation(contexts: EnumMember)
```

#### Target

The trait envelope property where the context will be applied.
`ModelProperty`

#### Parameters

| Name     | Type         | Description                                                                                |
| -------- | ------------ | ------------------------------------------------------------------------------------------ |
| contexts | `EnumMember` | An enum member or union of enum members representing the trait's<br />applicable contexts. |
