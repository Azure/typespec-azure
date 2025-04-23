---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
---

Modify how `x-nullable` is resolved when a `$ref` is present

### Current Behavior
The current behavior places the `$ref` inside an `allOf` array alongside `x-nullable`, as shown below:
```json
"Dog": {
  "type": "object",
  "properties": {
    "type": {
      "type": "object",
      "x-nullable": true,
      "allOf": [
        {
          "$ref": "#/definitions/Pet"
        }
      ]
    }
  },
  "required": [
    "type"
  ]
},
```

### New Behavior
With this change, the `$ref` is no longer placed inside `allOf`. Instead, it is moved directly next to `x-nullable`, resulting in the following structure:
```json
"Dog": {
  "type": "object",
  "properties": {
    "type": {
      "x-nullable": true,
      "$ref": "#/definitions/Pet"
    }
  },
  "required": [
    "type"
  ]
},
```
