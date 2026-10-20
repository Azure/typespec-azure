---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Update the Java generator to TypeSpec core commit `e0bf2d24f` to fix discriminator handling for untagged intermediate models ([microsoft/typespec#12294](https://github.com/microsoft/typespec/pull/12294)), preserve continuation-token method parameters ([microsoft/typespec#12305](https://github.com/microsoft/typespec/pull/12305)), and add an option to include continuation-token parameters ([microsoft/typespec#12309](https://github.com/microsoft/typespec/pull/12309)).