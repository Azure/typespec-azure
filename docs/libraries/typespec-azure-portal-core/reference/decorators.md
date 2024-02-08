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
@Azure.Portal.about(options: Azure.Portal.AboutOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                              | Description                                                              |
| ------- | --------------------------------- | ------------------------------------------------------------------------ |
| options | `model Azure.Portal.AboutOptions` | Property options allows more detailed infomation about the resourceType. |

### `@browse` {#@Azure.Portal.browse}

Provides a Model customizing browse view of ARM resource.

```typespec
@Azure.Portal.browse(options: Azure.Portal.BrowseOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                               | Description                                                         |
| ------- | ---------------------------------- | ------------------------------------------------------------------- |
| options | `model Azure.Portal.BrowseOptions` | Property options provides browsing information of the resourceType. |

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
@Azure.Portal.marketplaceOffer(options: Azure.Portal.marketplaceOfferOptions)
```

#### Target

`Model`

#### Parameters

| Name    | Type                                         | Description                                                                  |
| ------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| options | `model Azure.Portal.marketplaceOfferOptions` | Property options provides marketplace offer information of the resourceType. |
