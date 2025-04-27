---
changeKind: breaking
packages:
  - "@azure-tools/typespec-autorest"
---

Modify how `x-nullable` is resolved when a `$ref` is present.

Previously, the `$ref` was placed inside an `allOf`. With this change, the `$ref` is now moved directly next to `x-nullable`.

```diff lang=json
"Dog": {
  "type": "object",
  "properties": {
  "type": {
    - "type": "object",
      "x-nullable": true,
    + "$ref": "#/definitions/Pet"
    - "allOf": [
    -   {
    -     "$ref": "#/definitions/Pet"
    -   }
    - ]
    }
  },
  "required": [
    "type"
  ]
}
```
