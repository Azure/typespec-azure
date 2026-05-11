---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Add `@clientName` csharp-scoped renames for the nested sub-clients of `IndividuallyParentClient` in the `client-initialization/individually-parent` spec. The original names (e.g. `IndividuallyParentNestedWithParamAliasClient`) combined with the deeply-nested test project path produced generated file paths exceeding the 260-character Windows path limit in downstream csharp emitters.
