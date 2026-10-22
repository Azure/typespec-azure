---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Strengthen `documentation-required` to reject explicitly empty or whitespace-only documentation and descriptions that repeat a declaration's name or the placeholder `description`. Ordinary properties use their authored names, regardless of JSON serialization names; HTTP parameters and multipart parts retain their HTTP names. Explicit-documentation checks also cover namespaces, interfaces, scalars, inline properties, union variants, and declarations exempt from missing-doc requirements when their documentation is exposed by the compiler. Operation descriptions are compared with both the source operation name and effective HTTP verb. Missing-documentation requirements and exemptions are unchanged. The existing data-plane and resource-manager rulesets already enable this rule.

```tsp
// Warns: the description only repeats the authored name.
/** Widget */
model Widget {}
```
