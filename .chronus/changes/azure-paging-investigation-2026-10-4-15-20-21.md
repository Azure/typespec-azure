---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-rulesets"
---

Enable the focused Azure Core `list-response-envelope` warning in both the `data-plane` and `resource-manager` rulesets. It flags request-only `@continuationToken` annotations on `@list` operations without banning paired-token paging. The broader ARM collection and response-envelope checks remain opt-in.