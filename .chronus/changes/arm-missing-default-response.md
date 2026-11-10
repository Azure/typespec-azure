---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `missing-default-response` to require an ARM fallback response across HTTP methods, without repeating missing-response diagnostics already owned by existing ARM rules.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```
