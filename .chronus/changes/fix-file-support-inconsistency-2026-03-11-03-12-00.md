---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix File support inconsistencies: contentType is now constant for File uploads with specific content types, response contentType header serializedName is set correctly, and accept header uses enum for multiple content types
