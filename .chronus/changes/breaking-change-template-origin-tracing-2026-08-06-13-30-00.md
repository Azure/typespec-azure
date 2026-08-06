---
changeKind: fix
packages:
  - "@azure-tools/typespec-breaking-change"
---

Improve origin resolution for template-instantiated model properties by tracing through compiler template metadata when `sourceProperty` is absent, and tighten the large ARM-spec integration coverage expectation accordingly.
