---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `require-standard-error-response` to require a standard ARM error response across HTTP methods, independently of existing ARM response rules.

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```
