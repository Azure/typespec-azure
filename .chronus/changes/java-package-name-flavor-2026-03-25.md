---
changeKind: internal
packages:
  - "@azure-tools/typespec-metadata"
---

Java package name now includes the Maven groupId prefix based on flavor and management/data plane.
The format is `{groupId}:{artifactId}` where groupId is:
- `com.azure` for data-plane libraries (default)
- `com.azure.resourcemanager` for management-plane (ARM) libraries
- `com.azure.v2` for data-plane libraries with `flavor: azurev2`
- `com.azure.resourcemanager.v2` for management-plane libraries with `flavor: azurev2`
