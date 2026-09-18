---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-latest-version-of-common-types` ARM lint rule that warns when services select or emit older ARM common-types versions instead of the latest available common-types version.

Resolve common-type versions from native TypeSpec metadata independently of OpenAPI reference path formatting.

Report common-type resolution failures at user usages through the linter so rule suppression and project-location filtering apply.
