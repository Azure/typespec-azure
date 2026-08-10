---
title: "Decorators (experimental)"
description: "Decorators exported by @azure-tools/typespec-azure-core/experimental"
toc_min_heading_level: 2
toc_max_heading_level: 3
llmstxt: true
---

## Azure.Core.Experimental

### `@changePropertyType` {#@Azure.Core.Experimental.changePropertyType}

Changes the type of a model property to a new type.

This can be used in situations where an existing model property type needs to be changed because it cannot be redefined.

WARNING: This decorator mutates the model property in place and should be used with EXTREME caution.

```typespec
@Azure.Core.Experimental.changePropertyType(newType: Model | Union | Scalar | Enum)
```

#### Target

The model property to change.
`ModelProperty`

#### Parameters

| Name    | Type                               | Description                                   |
| ------- | ---------------------------------- | --------------------------------------------- |
| newType | `Model \| Union \| Scalar \| Enum` | The new type to assign to the model property. |

### `@copyProperties` {#@Azure.Core.Experimental.copyProperties}

Copies the properties of `source` that do not already exist on `target` into `target`.

This can be used to add a group of properties to an existing model in cases where the model cannot be redefined.

WARNING: This decorator mutates the target model in place and should be used with EXTREME caution.

```typespec
@Azure.Core.Experimental.copyProperties(sourceModel: Model)
```

#### Target

The model to copy properties to.
`Model`

#### Parameters

| Name        | Type    | Description                        |
| ----------- | ------- | ---------------------------------- |
| sourceModel | `Model` | The model to copy properties from. |

### `@copyVariants` {#@Azure.Core.Experimental.copyVariants}

Copies the variants of `sourceUnion` that do not already exist on `target` into `target`.

This can be used to add a group of variants to an existing union in cases where the union cannot be redefined.

WARNING: This decorator mutates the target union in place and should be used with EXTREME caution.

```typespec
@Azure.Core.Experimental.copyVariants(sourceUnion: Union)
```

#### Target

The union to copy variants to.
`Union`

#### Parameters

| Name        | Type    | Description                      |
| ----------- | ------- | -------------------------------- |
| sourceUnion | `Union` | The union to copy variants from. |
