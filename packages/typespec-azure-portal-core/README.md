# @azure-tools/typespec-azure-portal-core

TypeSpec Azure Portal Core library

## Install

```bash
npm install @azure-tools/typespec-azure-portal-core
```

## Decorators

### Azure.Portal

- [`@about`](#@about)
- [`@browse`](#@browse)
- [`@displayName`](#@displayname)
- [`@marketplaceOffer`](#@marketplaceoffer)

#### `@about`

Provides a Model describing about of ARM resource.

```typespec
@Azure.Portal.about(options: Azure.Portal.AboutOptions)
```

##### Target

`Model`

##### Parameters

| Name    | Type                              | Description                                                              |
| ------- | --------------------------------- | ------------------------------------------------------------------------ |
| options | `model Azure.Portal.AboutOptions` | Property options allows more detailed infomation about the resourceType. |

#### `@browse`

Provides a Model customizing browse view of ARM resource.

```typespec
@Azure.Portal.browse(options: Azure.Portal.BrowseOptions)
```

##### Target

`Model`

##### Parameters

| Name    | Type                               | Description                                                         |
| ------- | ---------------------------------- | ------------------------------------------------------------------- |
| options | `model Azure.Portal.BrowseOptions` | Property options provides browsing information of the resourceType. |

#### `@displayName`

Provides a Model Property a display name

```typespec
@Azure.Portal.displayName(name: valueof string)
```

##### Target

`ModelProperty`

##### Parameters

| Name | Type                    | Description |
| ---- | ----------------------- | ----------- |
| name | `valueof scalar string` |             |

#### `@marketplaceOffer`

Provides a Model marketplace offer information of ARM resource.

```typespec
@Azure.Portal.marketplaceOffer(options: Azure.Portal.marketplaceOfferOptions)
```

##### Target

`Model`

##### Parameters

| Name    | Type                                         | Description                                                                  |
| ------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| options | `model Azure.Portal.marketplaceOfferOptions` | Property options provides marketplace offer information of the resourceType. |
