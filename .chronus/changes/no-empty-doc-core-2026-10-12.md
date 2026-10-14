---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Fix `documentation-required` to reject explicitly empty or whitespace-only documentation, including on namespaces, interfaces, scalars, inline properties, and union variants. Missing-documentation requirements and exemptions are unchanged. The existing data-plane and resource-manager rulesets already enable this strengthened rule.
