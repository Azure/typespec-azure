---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-patch` to require nonempty PATCH input whose writable JSON property names correspond to PUT input, including inherited operations and inherited and nested properties. Match object containers without Update-visible children to the PUT input at the same JSON position. Property types, formats, constraints and historical API-version shapes are not compared.
