---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Forward legacy headers, credential scopes, and logging options in modular clients, including a
deprecated package-local `credentialScopes` alias for clients that use OAuth scopes.
