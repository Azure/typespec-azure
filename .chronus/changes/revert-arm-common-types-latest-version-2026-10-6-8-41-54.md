---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Revert the latest-version requirement in `arm-common-types-version`. Explicitly selected older ARM common-types versions are accepted again, while missing explicit version configuration still produces a warning.