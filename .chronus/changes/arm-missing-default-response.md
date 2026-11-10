---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `missing-default-response` to require an ARM fallback response across HTTP methods, independently of existing ARM response rules.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```
