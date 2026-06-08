---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add new `bool-property-name-prefix` lint rule (enabled in the `best-practices:csharp` ruleset) that flags boolean properties and operation parameters whose names do not start with a verb prefix such as `Is`, `Has`, `Can`, `Should`, `Are`, `Was`, `Will`, `Do`, or `Does` followed by an uppercase letter, following the Azure SDK for .NET naming conventions.
