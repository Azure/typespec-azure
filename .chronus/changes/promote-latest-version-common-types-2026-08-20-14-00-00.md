---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-common-types-version` to warn when an ARM service or API version selects an older common-types version, while preserving the existing warning for missing explicit version configuration.

Latest-version warnings are now active wherever this existing rule is enabled, including the resource-manager ruleset. Update `@armCommonTypesVersion` to the latest version in `Azure.ResourceManager.CommonTypes.Versions`, or suppress `@azure-tools/typespec-azure-resource-manager/arm-common-types-version` when an older version is required for compatibility.

The rule checks effective version selections only.

Update current ARM samples to common-types v6. Legacy and version-compatibility samples retain their older selections with explicit, scoped suppressions.

Include the v6 common-types fixtures referenced by the samples and validate local OpenAPI references so missing files or definitions fail the sample tests.
