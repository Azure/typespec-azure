---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Strengthen `documentation-required` to reject blank documentation on its existing required targets and explicit descriptions that repeat a declaration's effective name or the placeholder `description`. Operation descriptions are compared with both the source operation name and effective HTTP verb. The existing data-plane and resource-manager rulesets already enable this rule.
