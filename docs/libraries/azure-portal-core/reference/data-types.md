---
title: "Data types"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Data types

## Azure.Portal

### `AboutOptions` {#Azure.Portal.AboutOptions}

Options for about of ARM resource.

```typespec
model Azure.Portal.AboutOptions
```

#### Properties

| Name           | Type                                                | Description                                                                                              |
| -------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| icon?          | [`FilePath`](./data-types.md#Azure.Portal.FilePath) | Icon which represent resource<br />                                                                      |
| displayName?   | `string`                                            | Display name which represent the resource<br />                                                          |
| keywords?      | `Array`                                             | Comma-separated set of words or phrases which allow users to search for your asset by identifiers.<br /> |
| learnMoreDocs? | `Array`                                             | Set of links which can help learn more about the resource<br />                                          |

### `BrowseOptions` {#Azure.Portal.BrowseOptions}

Options for browse of ARM resource.

```typespec
model Azure.Portal.BrowseOptions
```

#### Properties

| Name      | Type                                    | Description                                                                                                                                    |
| --------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| argQuery? | `union string \| Azure.Portal.FilePath` | argQuery can be a literal string query or KQL file path.<br />KQL query which represents all possible data for your desired browse view.<br /> |

### `FilePath` {#Azure.Portal.FilePath}

File path of a file

```typespec
model Azure.Portal.FilePath
```

#### Properties

| Name     | Type     | Description               |
| -------- | -------- | ------------------------- |
| filePath | `string` | File path of a file<br /> |

### `marketplaceOfferOptions` {#Azure.Portal.marketplaceOfferOptions}

Options for marketplaceOffer

```typespec
model Azure.Portal.marketplaceOfferOptions
```

#### Properties

| Name | Type     | Description                              |
| ---- | -------- | ---------------------------------------- |
| id?  | `string` | Marketplace offer id of a resource<br /> |

### `PromotionOptions` {#Azure.Portal.PromotionOptions}

Options for promotion of ARM resource.

```typespec
model Azure.Portal.PromotionOptions
```

#### Properties

| Name        | Type                         | Description |
| ----------- | ---------------------------- | ----------- |
| apiVersion  | `union string \| EnumMember` |             |
| autoUpdate? | `boolean`                    |             |
