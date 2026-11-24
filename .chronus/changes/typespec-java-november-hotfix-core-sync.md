---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Update the Java generator to TypeSpec core commit `35cd3c4f8`. Fix XML storage generation regressions ([microsoft/typespec#12635](https://github.com/microsoft/typespec/pull/12635)) and propagate synchronous ARM long-running operation failures ([microsoft/typespec#12633](https://github.com/microsoft/typespec/pull/12633)). Use JavaParser for unused-import cleanup ([microsoft/typespec#12622](https://github.com/microsoft/typespec/pull/12622)), reduce duplicate ARM implementations ([microsoft/typespec#12645](https://github.com/microsoft/typespec/pull/12645)), and generate ClientCore HTTP operations without requiring its annotation processor ([microsoft/typespec#12621](https://github.com/microsoft/typespec/pull/12621)).
