---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-patch` to require nonempty PATCH input whose writable JSON properties correspond to PUT input, including inherited operations and inherited and nested properties. Match object containers without Update-visible children to the PUT input at the same JSON position. Check direct formats, string lengths, item counts and numeric bounds, including inherited scalar constraints and nullable property resets. General type compatibility, encoded representations, collection contents and historical API-version shapes are not evaluated.
