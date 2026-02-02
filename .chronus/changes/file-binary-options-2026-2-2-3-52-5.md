---
"@azure-tools/typespec-client-generator-core": minor
---

Full support for `Http.File` in TCGC:
- Add `isText`, `contentTypes`, and `filename` properties to `BinarySerializationOptions` for file types
- `filename` is now a `ModelProperty` type instead of a string
- Move file serialization logic from `http.ts` to `updateSerializationOptions` in `types.ts`
- Skip json/xml serialization options for file types
