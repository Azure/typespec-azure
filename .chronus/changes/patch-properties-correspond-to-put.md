---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `patch-properties-correspond-to-put` lint rule to compare effective PUT and PATCH input properties using native request visibility. Preserve missing and empty PATCH-body safeguards while leaving PUT-body validity and required envelope properties to their separate rules.
