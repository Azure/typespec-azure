---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Update the Java generator to TypeSpec core commit `cba4987c6` to prevent service-defined YAML map keys, such as discriminator value `responses`, from being interpreted as code-model properties ([microsoft/typespec#12434](https://github.com/microsoft/typespec/pull/12434)).
