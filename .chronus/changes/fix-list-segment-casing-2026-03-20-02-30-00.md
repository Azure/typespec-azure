---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fixed incorrect segment casing for list operations in LegacyOperations/RoutedOperations. The list operation now correctly preserves the segment casing from the ResourceTypeParameter, matching the CRUD operations.
