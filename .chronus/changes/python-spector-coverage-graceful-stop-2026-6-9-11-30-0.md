---
changeKind: internal
packages:
  - "@azure-tools/typespec-python"
---

Gracefully stop the spector mock server at the end of the test session so it writes its coverage file, removing the need for an extra pipeline step.
