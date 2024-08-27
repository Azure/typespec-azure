---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<object, Record<string, any>, 
  | "browse"
  | "about"
  | "marketplaceOffer"
  | "displayName"
| "promotion">;
```

## Type declaration

| Name | Type |
| ------ | ------ |
| `file-not-found` | `object` |
| `file-not-found.default` | `CallableMessage`<[`"decoratorName"`, `"propertyName"`, `"filePath"`]\> |
| `invalid-apiversion` | `object` |
| `invalid-apiversion.promotionVersion` | `CallableMessage`<[`"version"`]\> |
| `invalid-apiversion.serviceVersion` | `CallableMessage`<[`"version"`]\> |
| `invalid-apiversion.versionsList` | `CallableMessage`<[`"version"`]\> |
| `invalid-link` | `object` |
| `invalid-link.default` | `CallableMessage`<[`"link"`]\> |
| `invalid-offer-id` | `object` |
| `invalid-offer-id.marketplaceOfferId` | `"@marketplaceOffer id cannot have a blank space."` |
| `invalid-type` | `object` |
| `invalid-type.argQueryFile` | `CallableMessage`<[`"filePath"`]\> |
| `invalid-type.argQueryString` | `CallableMessage`<[`"query"`]\> |
| `invalid-type.iconSvg` | `CallableMessage`<[`"filePath"`]\> |
| `not-a-resource` | `object` |
| `not-a-resource.browse` | `"@browse can only be applied to TrackedResource models"` |
| `not-a-resource.default` | `CallableMessage`<[`"decoratorName"`]\> |
| `too-many-essentials` | `object` |
| `too-many-essentials.default` | `"essentials can be only used 5 times in ModelProperty."` |
