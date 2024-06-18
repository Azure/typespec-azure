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

| Member | Type | Value |
| :------ | :------ | :------ |
| `file-not-found` | `object` | ... |
| `file-not-found.default` | `CallableMessage`<[`string`, `string`, `string`]\> | ... |
| `invalid-apiversion` | `object` | ... |
| `invalid-apiversion.promotionVersion` | `CallableMessage`<[`string`]\> | ... |
| `invalid-apiversion.serviceVersion` | `CallableMessage`<[`string`]\> | ... |
| `invalid-apiversion.versionsList` | `CallableMessage`<[`string`]\> | ... |
| `invalid-link` | `object` | ... |
| `invalid-link.default` | `CallableMessage`<[`string`]\> | ... |
| `invalid-offer-id` | `object` | ... |
| `invalid-offer-id.marketplaceOfferId` | `"@marketplaceOffer id cannot have a blank space."` | ... |
| `invalid-type` | `object` | ... |
| `invalid-type.argQueryFile` | `CallableMessage`<[`string`]\> | ... |
| `invalid-type.argQueryString` | `CallableMessage`<[`string`]\> | ... |
| `invalid-type.iconSvg` | `CallableMessage`<[`string`]\> | ... |
| `not-a-resource` | `object` | ... |
| `not-a-resource.browse` | `"@browse can only be applied to TrackedResource models"` | ... |
| `not-a-resource.default` | `CallableMessage`<[`string`]\> | ... |
| `too-many-essentials` | `object` | ... |
| `too-many-essentials.default` | `"essentials can be only used 5 times in ModelProperty."` | ... |
