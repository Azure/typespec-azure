---
title: "Decorators"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

## Azure.Portal

### `@about` {#@Azure.Portal.about}

Provides a Model describing about of ARM resource.

```typespec
@Azure.Portal.about(options: Azure.Portal.AboutOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                                                        | Description                                                              |
| ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| options | [`AboutOptions`](./data-types.md#Azure.Portal.AboutOptions) | Property options allows more detailed infomation about the resourceType. |

### `@browse` {#@Azure.Portal.browse}

Provides a Model customizing browse view of ARM resource.

```typespec
@Azure.Portal.browse(options: Azure.Portal.BrowseOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                                                          | Description                                                         |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| options | [`BrowseOptions`](./data-types.md#Azure.Portal.BrowseOptions) | Property options provides browsing information of the resourceType. |

### `@displayName` {#@Azure.Portal.displayName}

Provides a Model Property a display name

```typespec
@Azure.Portal.displayName(name: valueof string)
```

#### Target

`ModelProperty`

#### Parameters

| Name | Type             | Description |
| ---- | ---------------- | ----------- |
| name | `valueof string` |             |

### `@marketplaceOffer` {#@Azure.Portal.marketplaceOffer}

Provides a Model marketplace offer information of ARM resource.

```typespec
@Azure.Portal.marketplaceOffer(options: Azure.Portal.MarketplaceOfferOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                                                                              | Description                                                                  |
| ------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| options | [`MarketplaceOfferOptions`](./data-types.md#Azure.Portal.MarketplaceOfferOptions) | Property options provides marketplace offer information of the resourceType. |

### `@promotion` {#@Azure.Portal.promotion}

Provides a Model customizing deployment promotion apiVersion for ARM resource.
The apiVersion will be used as a version to deploy to Portal.

```typespec
@Azure.Portal.promotion(options: Azure.Portal.PromotionOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                                                                | Description                                                          |
| ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| options | [`PromotionOptions`](./data-types.md#Azure.Portal.PromotionOptions) | Property options provides promotion information of the resourceType. |
