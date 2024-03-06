---
jsApi: true
title: "[V] $lib"

---
```ts
const $lib: TypeSpecLibrary<Object, Record<string, any>, 
  | "browse"
  | "about"
  | "marketplaceOffer"
  | "displayName"
| "promotion">;
```

## Type declaration

| Member | Type | Value |
| :------ | :------ | :------ |
| `file-not-found` | `Object` | - |
| `file-not-found.default` | `CallableMessage`<[`string`, `string`, `string`]\> | - |
| `invalid-apiversion` | `Object` | - |
| `invalid-apiversion.promotionVersion` | `CallableMessage`<[`string`]\> | - |
| `invalid-apiversion.serviceVersion` | `CallableMessage`<[`string`]\> | - |
| `invalid-apiversion.versionsList` | `CallableMessage`<[`string`]\> | - |
| `invalid-link` | `Object` | - |
| `invalid-link.default` | `CallableMessage`<[`string`]\> | - |
| `invalid-offer-id` | `Object` | - |
| `invalid-offer-id.marketplaceOfferId` | `"@marketplaceOffer id cannot have a blank space."` | - |
| `not-a-resource` | `Object` | - |
| `not-a-resource.default` | `CallableMessage`<[`string`]\> | - |
| `too-many-essentials` | `Object` | - |
| `too-many-essentials.default` | `"essentials can be only used 5 times in ModelProperty."` | - |
