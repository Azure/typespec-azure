---
title: "Decorators"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Decorators

## Azure.Portal

### `@about` {#@Azure.Portal.about}

Provides a Model describing about of ARM resource.

```typespec
@Azure.Portal.about(option: Azure.Portal.AboutOption)
```

#### Target

`Model`

#### Parameters

| Name   | Type                             | Description                                                             |
| ------ | -------------------------------- | ----------------------------------------------------------------------- |
| option | `model Azure.Portal.AboutOption` | Property option allows more detailed infomation about the resourceType. |

### `@browse` {#@Azure.Portal.browse}

Provides a Model customizing browse view of ARM resource.

```typespec
@Azure.Portal.browse(option: Azure.Portal.BrowseOption)
```

#### Target

`Model`

#### Parameters

| Name   | Type                              | Description                                                        |
| ------ | --------------------------------- | ------------------------------------------------------------------ |
| option | `model Azure.Portal.BrowseOption` | Property option provides browsing information of the resourceType. |

### `@displayName` {#@Azure.Portal.displayName}

Provides a Model Property a display name

```typespec
@Azure.Portal.displayName(name: valueof string)
```

#### Target

`ModelProperty`

#### Parameters

| Name | Type                    | Description |
| ---- | ----------------------- | ----------- |
| name | `valueof scalar string` |             |

### `@marketplaceOffer` {#@Azure.Portal.marketplaceOffer}

Provides a Model marketplace offer information of ARM resource.

```typespec
@Azure.Portal.marketplaceOffer(option: Azure.Portal.marketplaceOfferOption)
```

#### Target

`Model`

#### Parameters

| Name   | Type                                        | Description                                                                 |
| ------ | ------------------------------------------- | --------------------------------------------------------------------------- |
| option | `model Azure.Portal.marketplaceOfferOption` | Property option provides marketplace offer information of the resourceType. |

### `@promotion` {#@Azure.Portal.promotion}

Provides a Model customizing deployment promotion apiVersion for ARM resource.
The apiVersion will be used as a version to deploy to Portal.

```typespec
@Azure.Portal.promotion(option: Azure.Portal.PromotionOption)
```

#### Target

`Model`

#### Parameters

| Name   | Type                                 | Description                                                         |
| ------ | ------------------------------------ | ------------------------------------------------------------------- |
| option | `model Azure.Portal.PromotionOption` | Property option provides promotion information of the resourceType. |
