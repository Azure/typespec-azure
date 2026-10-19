---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Update the Java generator to TypeSpec core commit `e3ac928e6` to fix discriminator handling for untagged intermediate models ([microsoft/typespec#12294](https://github.com/microsoft/typespec/pull/12294)) and preserve continuation-token method parameters ([microsoft/typespec#12305](https://github.com/microsoft/typespec/pull/12305)).