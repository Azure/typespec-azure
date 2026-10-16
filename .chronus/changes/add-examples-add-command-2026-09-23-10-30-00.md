---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-examples"
---

Add the `tsp-examples add` command that adds examples for a new API version, adding an entry only when an operation is new or its contract changed (parity with OpenAPI-diff): changed operations get a `since` variant cloned from the previous example, new operations get a schema-shaped skeleton, and unchanged operations are left untouched.
