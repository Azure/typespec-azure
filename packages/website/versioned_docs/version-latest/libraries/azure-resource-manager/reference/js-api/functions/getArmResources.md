---
jsApi: true
title: "[F] getArmResources"

---
```ts
function getArmResources(program): ArmResourceDetails[]
```

This function returns fully-resolved details about all ARM resources
 registered in the TypeSpec document including operations and their details.

 It should only be called after the full TypeSpec document has been compiled
 so that operation route details are certain to be present.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `program` | `Program` |

## Returns

[`ArmResourceDetails`](../interfaces/ArmResourceDetails.md)[]
