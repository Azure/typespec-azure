---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Preserve subtype fields when serializing encoded enum discriminators by dispatching on client values and translating discriminator values between client and JSON representations. Use client enum values in generated request samples and hierarchy property types, and escape encoded discriminator case labels.
