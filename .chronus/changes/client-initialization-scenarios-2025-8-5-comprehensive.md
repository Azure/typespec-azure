---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Add comprehensive client initialization test scenarios for Azure Client Generator Core. Extended the existing test suite from 8 to 23 scenarios covering all combinations of `initializedBy` parameter values including default, individually, parent, and both modes. Added nested two-layer scenarios to test complex client initialization hierarchies.

Features added:
- 4 basic initialization scenarios covering all `initializedBy` combinations
- 12 nested two-layer scenarios testing first-layer × second-layer combinations
- Comprehensive test matrix ensuring complete coverage of client initialization modes
- Mock API implementations for all new scenarios
- Detailed scenario documentation for each test case
