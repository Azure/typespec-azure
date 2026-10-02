---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Configure `casing-style` per declaration category, including opt-in `snake_case` properties,
operation parameters, union variants, and enum members. Existing Azure defaults remain unchanged.

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-core/casing-style":
      modelProperty: snake_case
      union: PascalCase
      unionVariant: snake_case
      enum: PascalCase
      enumMember: snake_case
      scalar: PascalCase
```
