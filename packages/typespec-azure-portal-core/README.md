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
- [`@promotion`](#@promotion)

#### `@about`

Provides a Model describing about of ARM resource.

```typespec
@Azure.Portal.about(option: Azure.Portal.AboutOption)
```

##### Target

`Model`

##### Parameters

| Name   | Type                             | Description                                                             |
| ------ | -------------------------------- | ----------------------------------------------------------------------- |
| option | `model Azure.Portal.AboutOption` | Property option allows more detailed infomation about the resourceType. |

#### `@browse`

Provides a Model customizing browse view of ARM resource.

```typespec
@Azure.Portal.browse(option: Azure.Portal.BrowseOption)
```

##### Target

`Model`

##### Parameters

| Name   | Type                              | Description                                                        |
| ------ | --------------------------------- | ------------------------------------------------------------------ |
| option | `model Azure.Portal.BrowseOption` | Property option provides browsing information of the resourceType. |

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
@Azure.Portal.marketplaceOffer(option: Azure.Portal.marketplaceOfferOption)
```

##### Target

`Model`

##### Parameters

| Name   | Type                                        | Description                                                                 |
| ------ | ------------------------------------------- | --------------------------------------------------------------------------- |
| option | `model Azure.Portal.marketplaceOfferOption` | Property option provides marketplace offer information of the resourceType. |

#### `@promotion`

Provides a Model customizing deployment promotion apiVersion for ARM resource.
The apiVersion will be used as a version to deploy to Portal.

```typespec
@Azure.Portal.promotion(option: Azure.Portal.PromotionOption)
```

##### Target

`Model`

##### Parameters

| Name   | Type                                 | Description                                                         |
| ------ | ------------------------------------ | ------------------------------------------------------------------- |
| option | `model Azure.Portal.PromotionOption` | Property option provides promotion information of the resourceType. |
