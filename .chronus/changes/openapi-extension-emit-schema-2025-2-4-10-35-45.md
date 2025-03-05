---
changeKind: breaking
packages:
  - "@azure-tools/typespec-autorest"
---

Updates the `@extension` behavior to emit schemas for passed in Types. Values will continue to be emitted as raw data. Model and Tuple expressions that were previously treated as Values are now treated as Types.

Now the following TypeSpec:
```tsp
@OpenAPI.extension("x-value", "custom value")
@OpenAPI.extension("x-schema", typeof "custom value")
model Foo {}
```
emits the following schema:
```yaml
Foo:
  type: object
  x-value: custom value
  x-schema:
    type: string
    enum:
      - custom value
```
