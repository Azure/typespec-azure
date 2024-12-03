---
title: "Data types"
---

## Azure.Portal

### `AboutOptions` {#Azure.Portal.AboutOptions}

Options for about of ARM resource.

```typespec
model Azure.Portal.AboutOptions
```

#### Properties

| Name           | Type                                                                      | Description                                                                                        |
| -------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| icon?          | [`FilePath`](./data-types.md#Azure.Portal.FilePath)                       | Icon which represent resource                                                                      |
| displayNames?  | [`DisplayNamesOptions`](./data-types.md#Azure.Portal.DisplayNamesOptions) | Display names which represent the resource                                                         |
| keywords?      | `string[]`                                                                | Comma-separated set of words or phrases which allow users to search for your asset by identifiers. |
| learnMoreDocs? | `Portal.LearnMoreDocsOptions[]`                                           | Set of links which can help learn more about the resource                                          |

### `BrowseOptions` {#Azure.Portal.BrowseOptions}

Options for browse of ARM resource.

```typespec
model Azure.Portal.BrowseOptions
```

#### Properties

| Name      | Type                        | Description                                                                                                                              |
| --------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| argQuery? | `string \| Portal.FilePath` | argQuery can be a literal string query or KQL file path.<br />KQL query which represents all possible data for your desired browse view. |

### `DisplayNamesOptions` {#Azure.Portal.DisplayNamesOptions}

Options for displayNames of ARM resources.

```typespec
model Azure.Portal.DisplayNamesOptions
```

#### Properties

| Name     | Type     | Description |
| -------- | -------- | ----------- |
| singular | `string` |             |
| plural   | `string` |             |

### `FilePath` {#Azure.Portal.FilePath}

File path of a file

```typespec
model Azure.Portal.FilePath
```

#### Properties

| Name     | Type     | Description         |
| -------- | -------- | ------------------- |
| filePath | `string` | File path of a file |

### `LearnMoreDocsOptions` {#Azure.Portal.LearnMoreDocsOptions}

Options for learnMoreDocs of ARM resources.

```typespec
model Azure.Portal.LearnMoreDocsOptions
```

#### Properties

| Name  | Type     | Description |
| ----- | -------- | ----------- |
| title | `string` |             |
| uri   | `string` |             |

### `MarketplaceOfferOptions` {#Azure.Portal.MarketplaceOfferOptions}

Options for marketplaceOffer

```typespec
model Azure.Portal.MarketplaceOfferOptions
```

#### Properties

| Name | Type     | Description                        |
| ---- | -------- | ---------------------------------- |
| id?  | `string` | Marketplace offer id of a resource |

### `PromotionOptions` {#Azure.Portal.PromotionOptions}

Options for promotion of ARM resource.

```typespec
model Azure.Portal.PromotionOptions
```

#### Properties

| Name        | Type                   | Description |
| ----------- | ---------------------- | ----------- |
| apiVersion  | `string \| EnumMember` |             |
| autoUpdate? | `boolean`              |             |
